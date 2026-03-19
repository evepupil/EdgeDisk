import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { renderDashboardHtml, renderShareHtml } from "./templates.ts";

interface Env {
  APP_NAME?: string;
  ACCESS_AUD?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ADMIN_EMAIL?: string;
  MAX_LIST_KEYS?: string;
  DISABLE_ACCESS_AUTH?: string;
  DISK: R2Bucket;
  SHARES: KVNamespace;
}

type SessionInfo = { email: string };
type ShareKind = "file" | "folder";

type ShareRecord = {
  kind: ShareKind;
  path: string;
  createdAt: string;
  expiresAt: string | null;
  createdBy?: string;
};

type ListedFile = {
  kind: "file";
  name: string;
  path: string;
  size: number;
  uploaded: string | null;
  etag: string | null;
  contentType: string | null;
  subpath?: string;
};

type ListedFolder = {
  kind: "folder";
  name: string;
  path: string;
  subpath?: string;
};

const jsonHeaders = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await routeRequest(request, env);
    } catch (error) {
      return respondError(error);
    }
  }
};

async function routeRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/") {
    return Response.redirect(`${url.origin}/app`, 302);
  }

  if (path === "/app") {
    await requireAdmin(request, env);
    return html(renderDashboardHtml({ appName: env.APP_NAME || "EdgeDisk" }));
  }

  if (path === "/api/session") {
    return json(await requireAdmin(request, env));
  }

  if (path === "/api/list") {
    await requireAdmin(request, env);
    return json(await listDirectory(env, normalizeDirectoryPath(url.searchParams.get("prefix") || "")));
  }

  if (path === "/api/object" && request.method === "GET") {
    await requireAdmin(request, env);
    const rawPath = url.searchParams.get("path");
    if (!rawPath) throw new HttpError(400, "缺少 path 参数");
    return json(await getObjectDetail(env, normalizeAnyPath(rawPath)));
  }

  if (path === "/api/object" && request.method === "DELETE") {
    await requireAdmin(request, env);
    const rawPath = url.searchParams.get("path");
    if (!rawPath) throw new HttpError(400, "缺少 path 参数");
    return json(await deleteObject(env, normalizeAnyPath(rawPath)));
  }

  if (path === "/api/file") {
    await requireAdmin(request, env);
    const rawPath = url.searchParams.get("path");
    if (!rawPath) throw new HttpError(400, "缺少 path 参数");
    return streamObject(env, normalizeFilePath(rawPath), url.searchParams.get("download") === "1");
  }

  if (path === "/api/upload" && request.method === "POST") {
    await requireAdmin(request, env);
    return json(await handleUpload(request, env), 201);
  }

  if (path === "/api/share" && request.method === "POST") {
    const session = await requireAdmin(request, env);
    const payload = await request.json<Record<string, unknown>>();
    const kind = parseShareKind(payload.kind);
    const rawPath = String(payload.path || "");
    const expiresInDays = parseOptionalNonNegativeNumber(payload.expiresInDays);
    if (!rawPath) throw new HttpError(400, "分享参数不完整");
    return json(await createShare(env, session.email, kind, rawPath, expiresInDays, request.url), 201);
  }

  if (path === "/api/share" && request.method === "DELETE") {
    await requireAdmin(request, env);
    const code = url.searchParams.get("code") || "";
    if (!code) throw new HttpError(400, "缺少分享码");
    const revoked = await revokeShare(env, code);
    if (!revoked) throw new HttpError(404, "分享不存在或已失效");
    return json({ revoked: true, code });
  }

  if (path === "/api/shares") {
    await requireAdmin(request, env);
    const kind = parseShareKind(url.searchParams.get("kind"));
    const rawPath = url.searchParams.get("path") || "";
    if (!rawPath) throw new HttpError(400, "缺少 path 参数");
    const normalizedPath = kind === "folder" ? normalizeDirectoryPath(rawPath) : normalizeFilePath(rawPath);
    return json({ shares: await listSharesByTarget(env, kind, normalizedPath, url.origin) });
  }

  if (path.startsWith("/share-api/")) {
    const shareCode = path.slice("/share-api/".length);
    if (!shareCode) throw new HttpError(404, "分享不存在");
    return json(await getShareView(env, shareCode, normalizeOptionalRelativePath(url.searchParams.get("sub") || ""), url.origin));
  }

  if (path.startsWith("/s/")) {
    const parts = path.slice(3).split("/");
    const shareCode = parts[0];
    const action = parts[1] || "";
    if (!shareCode) throw new HttpError(404, "分享不存在");
    if (!action) {
      await getShareRecord(env, shareCode);
      return html(renderShareHtml({ appName: env.APP_NAME || "EdgeDisk", shareCode }));
    }
    if (action === "file") {
      return streamSharedObject(env, shareCode, url.searchParams.get("path"), url.searchParams.get("download") === "1");
    }
    throw new HttpError(404, "分享操作不存在");
  }

  throw new HttpError(404, "路由不存在");
}

function html(content: string, status = 200): Response {
  return new Response(content, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

function respondError(error: unknown): Response {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  return json({ error: error instanceof Error ? error.message : "未知错误" }, 500);
}

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function requireAdmin(request: Request, env: Env): Promise<SessionInfo> {
  if (env.DISABLE_ACCESS_AUTH === "true") return { email: env.ADMIN_EMAIL || "local-dev@example.com" };
  if (!env.ACCESS_AUD || !env.ACCESS_TEAM_DOMAIN) throw new HttpError(500, "请先配置 ACCESS_AUD 和 ACCESS_TEAM_DOMAIN");

  const token = request.headers.get("cf-access-jwt-assertion") || getCookie(request.headers.get("cookie"), "CF_Authorization");
  if (!token) throw new HttpError(401, "缺少 Cloudflare Access JWT");

  let payload: JWTPayload;
  try {
    payload = await verifyAccessToken(token, env.ACCESS_TEAM_DOMAIN, env.ACCESS_AUD);
  } catch (error) {
    throw new HttpError(403, `Access 验证失败：${error instanceof Error ? error.message : "JWT 校验失败"}`);
  }

  const email = String(payload.email || payload.sub || "").trim();
  if (!email) throw new HttpError(403, "Access JWT 中缺少邮箱信息");
  if (env.ADMIN_EMAIL && email.toLowerCase() !== env.ADMIN_EMAIL.toLowerCase()) throw new HttpError(403, "当前登录账号没有 EdgeDisk 访问权限");
  return { email };
}

async function verifyAccessToken(token: string, teamDomain: string, aud: string): Promise<JWTPayload> {
  const domain = normalizeTeamDomain(teamDomain);
  const certsUrl = `${domain}/cdn-cgi/access/certs`;
  let jwks = jwksCache.get(certsUrl);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(certsUrl));
    jwksCache.set(certsUrl, jwks);
  }
  const { payload } = await jwtVerify(token, jwks, { issuer: domain, audience: aud });
  return payload;
}

function normalizeTeamDomain(teamDomain: string): string {
  const trimmed = teamDomain.trim().replace(/\/+$/, "");
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function getCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const pair of header.split(";")) {
    const [cookieName, ...rest] = pair.trim().split("=");
    if (cookieName === name) return rest.join("=");
  }
  return null;
}

async function listDirectory(env: Env, prefix: string) {
  const list = await env.DISK.list({ prefix, delimiter: "/", limit: toPositiveInteger(env.MAX_LIST_KEYS, 1000) });
  const folders: ListedFolder[] = (list.delimitedPrefixes || []).map((item) => ({ kind: "folder" as const, name: baseName(item.slice(0, -1)), path: item })).sort((a, b) => a.path.localeCompare(b.path, "zh-CN"));
  const files: ListedFile[] = list.objects.filter((item) => item.key !== prefix).map((item) => ({ kind: "file" as const, name: baseName(item.key), path: item.key, size: item.size, uploaded: item.uploaded ? item.uploaded.toISOString() : null, etag: item.httpEtag || item.etag || null, contentType: item.httpMetadata?.contentType || null })).sort((a, b) => a.path.localeCompare(b.path, "zh-CN"));
  return { prefix, folders, files };
}

async function getObjectDetail(env: Env, path: string) {
  if (path.endsWith("/")) {
    const stats = await countDirectoryObjects(env, path);
    return { kind: "folder", path, name: baseName(path.slice(0, -1)) || "/", size: null, uploaded: null, contentType: null, etag: null, childCount: stats.childCount, totalSize: stats.totalSize };
  }

  const head = await env.DISK.head(path);
  if (!head) throw new HttpError(404, "文件不存在");
  return { kind: "file", path, name: baseName(path), size: head.size, uploaded: head.uploaded ? head.uploaded.toISOString() : null, contentType: head.httpMetadata?.contentType || null, etag: head.httpEtag || head.etag || null };
}

async function handleUpload(request: Request, env: Env) {
  const formData = await request.formData();
  const basePath = normalizeDirectoryPath(String(formData.get("basePath") || ""));
  const files = formData.getAll("files");
  const paths = formData.getAll("paths").map((item) => String(item));
  if (!files.length) throw new HttpError(400, "没有收到任何文件");
  if (files.length !== paths.length) throw new HttpError(400, "上传路径和文件数量不一致");

  let uploaded = 0;
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    if (!file || typeof file !== "object" || typeof (file as Blob).stream !== "function") continue;
    const upload = file as File;
    const key = joinPath(basePath, normalizeRelativeFilePath(paths[index] || upload.name));
    await env.DISK.put(key, upload.stream(), { httpMetadata: { contentType: upload.type || undefined } });
    uploaded += 1;
  }
  return { uploaded };
}

async function deleteObject(env: Env, path: string) {
  if (path.endsWith("/")) {
    const keys = await collectObjectKeys(env, path);
    if (keys.length) await env.DISK.delete(keys);
    const revokedShares = await revokeSharesForPath(env, path, true);
    return { deleted: keys.length, revokedShares, kind: "folder", path };
  }

  const head = await env.DISK.head(path);
  if (!head) throw new HttpError(404, "文件不存在");
  await env.DISK.delete(path);
  const revokedShares = await revokeSharesForPath(env, path, false);
  return { deleted: 1, revokedShares, kind: "file", path };
}

async function createShare(env: Env, createdBy: string, kind: ShareKind, rawPath: string, expiresInDays: number | null, requestUrl: string) {
  const normalizedPath = kind === "folder" ? normalizeDirectoryPath(rawPath) : normalizeFilePath(rawPath);
  if (kind === "file") {
    if (!(await env.DISK.head(normalizedPath))) throw new HttpError(404, "待分享文件不存在");
  } else {
    const check = await env.DISK.list({ prefix: normalizedPath, limit: 1 });
    if (!check.objects.length && !(check.delimitedPrefixes || []).length) throw new HttpError(404, "待分享文件夹不存在或为空");
  }

  const code = await generateShareCode(env);
  const record: ShareRecord = {
    kind,
    path: normalizedPath,
    createdAt: new Date().toISOString(),
    expiresAt: expiresInDays && expiresInDays > 0 ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString() : null,
    createdBy
  };

  await env.SHARES.put(shareStorageKey(code), JSON.stringify(record));
  await env.SHARES.put(shareTargetIndexKey(kind, normalizedPath, code), "1");
  return { code, url: `${new URL(requestUrl).origin}/s/${code}`, record };
}

async function listSharesByTarget(env: Env, kind: ShareKind, path: string, origin: string) {
  const prefix = shareTargetIndexPrefix(kind, path);
  const codes = await collectShareCodesByPrefix(env, prefix);
  const shares: Array<Record<string, string | null>> = [];

  for (const code of codes) {
    try {
      const record = await getShareRecord(env, code);
      shares.push({ code, url: `${origin}/s/${code}`, kind: record.kind, path: record.path, createdAt: record.createdAt, expiresAt: record.expiresAt, createdBy: record.createdBy || null });
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 404)) throw error;
    }
  }

  shares.sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt), "zh-CN"));
  return shares;
}

async function getShareRecord(env: Env, shareCode: string): Promise<ShareRecord> {
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(shareCode)) throw new HttpError(404, "分享不存在");
  const raw = await env.SHARES.get(shareStorageKey(shareCode));
  if (!raw) throw new HttpError(404, "分享不存在或已失效");

  const record = JSON.parse(raw) as ShareRecord;
  if (record.expiresAt && new Date(record.expiresAt).getTime() <= Date.now()) {
    await revokeShare(env, shareCode, record);
    throw new HttpError(404, "分享已过期");
  }
  return record;
}

async function revokeShare(env: Env, shareCode: string, knownRecord?: ShareRecord): Promise<boolean> {
  const record = knownRecord || (await getShareRecordRaw(env, shareCode));
  if (!record) return false;
  await env.SHARES.delete(shareStorageKey(shareCode));
  await env.SHARES.delete(shareTargetIndexKey(record.kind, record.path, shareCode));
  return true;
}

async function getShareRecordRaw(env: Env, shareCode: string): Promise<ShareRecord | null> {
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(shareCode)) return null;
  const raw = await env.SHARES.get(shareStorageKey(shareCode));
  return raw ? (JSON.parse(raw) as ShareRecord) : null;
}

async function getShareView(env: Env, shareCode: string, sub: string, origin: string) {
  const share = await getShareRecord(env, shareCode);
  if (share.kind === "file") {
    const head = await env.DISK.head(share.path);
    if (!head) throw new HttpError(404, "分享文件已不存在");
    return {
      kind: "file",
      shareCode,
      shareUrl: `${origin}/s/${shareCode}`,
      rootPath: share.path,
      currentPrefix: share.path,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
      file: { name: baseName(share.path), size: head.size, uploaded: head.uploaded ? head.uploaded.toISOString() : null, etag: head.httpEtag || head.etag || null, contentType: head.httpMetadata?.contentType || null }
    };
  }

  const currentPrefix = joinPath(share.path, sub);
  const list = await env.DISK.list({ prefix: currentPrefix, delimiter: "/", limit: toPositiveInteger(env.MAX_LIST_KEYS, 1000) });
  const folders: ListedFolder[] = (list.delimitedPrefixes || []).map((item) => ({ kind: "folder" as const, name: baseName(item.slice(0, -1)), path: item, subpath: item.slice(share.path.length) })).sort((a, b) => a.path.localeCompare(b.path, "zh-CN"));
  const files: ListedFile[] = list.objects.filter((item) => item.key !== currentPrefix).map((item) => ({ kind: "file" as const, name: baseName(item.key), path: item.key, subpath: item.key.slice(share.path.length), size: item.size, uploaded: item.uploaded ? item.uploaded.toISOString() : null, etag: item.httpEtag || item.etag || null, contentType: item.httpMetadata?.contentType || null })).sort((a, b) => a.path.localeCompare(b.path, "zh-CN"));
  return { kind: "folder", shareCode, shareUrl: `${origin}/s/${shareCode}`, rootPath: share.path, currentPrefix, createdAt: share.createdAt, expiresAt: share.expiresAt, folders, files };
}

async function streamObject(env: Env, path: string, download: boolean): Promise<Response> {
  const object = await env.DISK.get(path);
  if (!object) throw new HttpError(404, "文件不存在");
  return objectToResponse(object, baseName(path), download);
}

async function streamSharedObject(env: Env, shareCode: string, rawRelativePath: string | null, download: boolean): Promise<Response> {
  const share = await getShareRecord(env, shareCode);
  let key = share.path;
  if (share.kind === "folder") {
    if (!rawRelativePath) throw new HttpError(400, "文件夹分享下载时需要 path 参数");
    key = joinPath(share.path, normalizeRelativeFilePath(rawRelativePath));
  }
  const object = await env.DISK.get(key);
  if (!object) throw new HttpError(404, "分享文件不存在");
  return objectToResponse(object, baseName(key), download);
}

function objectToResponse(object: R2ObjectBody, fileName: string, download: boolean): Response {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag || object.etag);
  headers.set("cache-control", "private, max-age=0, no-store");
  headers.set("content-disposition", `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  return new Response(object.body, { headers });
}

async function generateShareCode(env: Env): Promise<string> {
  for (let index = 0; index < 8; index += 1) {
    const code = randomCode(8);
    if (!(await env.SHARES.get(shareStorageKey(code)))) return code;
  }
  throw new HttpError(500, "分享码生成失败，请稍后重试");
}

function randomCode(length: number): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

async function countDirectoryObjects(env: Env, prefix: string) {
  let cursor: string | undefined;
  let childCount = 0;
  let totalSize = 0;

  do {
    const batch = await env.DISK.list({ prefix, cursor, limit: 1000 });
    for (const object of batch.objects) {
      childCount += 1;
      totalSize += object.size;
    }
    cursor = batch.truncated ? batch.cursor : undefined;
  } while (cursor);

  return { childCount, totalSize };
}

async function collectObjectKeys(env: Env, prefix: string): Promise<string[]> {
  let cursor: string | undefined;
  const keys: string[] = [];

  do {
    const batch = await env.DISK.list({ prefix, cursor, limit: 1000 });
    for (const object of batch.objects) {
      keys.push(object.key);
    }
    cursor = batch.truncated ? batch.cursor : undefined;
  } while (cursor);

  return keys;
}

async function revokeSharesForPath(env: Env, path: string, recursiveFolder: boolean): Promise<number> {
  const prefixes = recursiveFolder
    ? [`share-target:file:${encodePathForShareKey(path)}`, `share-target:folder:${encodePathForShareKey(path)}`]
    : [shareTargetIndexPrefix("file", path)];

  const seen = new Set<string>();
  let revoked = 0;
  for (const prefix of prefixes) {
    const codes = await collectShareCodesByPrefix(env, prefix);
    for (const code of codes) {
      if (seen.has(code)) continue;
      seen.add(code);
      if (await revokeShare(env, code)) revoked += 1;
    }
  }
  return revoked;
}

async function collectShareCodesByPrefix(env: Env, prefix: string): Promise<string[]> {
  let cursor: string | undefined;
  const codes: string[] = [];

  do {
    const batch = await env.SHARES.list({ prefix, cursor, limit: 1000 });
    for (const key of batch.keys) {
      const separatorIndex = key.name.lastIndexOf("|");
      if (separatorIndex >= 0) codes.push(key.name.slice(separatorIndex + 1));
    }
    cursor = batch.list_complete ? undefined : batch.cursor;
  } while (cursor);

  return codes;
}

function shareStorageKey(code: string): string {
  return `share:${code}`;
}

function encodePathForShareKey(path: string): string {
  return encodeURIComponent(path);
}

function shareTargetIndexKey(kind: ShareKind, path: string, code: string): string {
  return `${shareTargetIndexPrefix(kind, path)}${code}`;
}

function shareTargetIndexPrefix(kind: ShareKind, path: string): string {
  return `share-target:${kind}:${encodePathForShareKey(path)}|`;
}

function parseShareKind(value: unknown): ShareKind {
  if (value === "folder") return "folder";
  if (value === "file") return "file";
  throw new HttpError(400, "分享类型不合法");
}

function parseOptionalNonNegativeNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(parsed) || parsed < 0) throw new HttpError(400, "过期时间不合法");
  return parsed;
}

function normalizeAnyPath(input: string): string {
  const value = sanitizePath(input);
  if (!value) throw new HttpError(400, "路径不能为空");
  return input.trim().endsWith("/") ? `${value}/` : value;
}

function normalizeFilePath(input: string): string {
  const value = sanitizePath(input);
  if (!value || value.endsWith("/")) throw new HttpError(400, "文件路径不合法");
  return value;
}

function normalizeDirectoryPath(input: string): string {
  const value = sanitizePath(input);
  return value ? `${value}/` : "";
}

function normalizeRelativeFilePath(input: string): string {
  const value = sanitizePath(input);
  if (!value || value.endsWith("/")) throw new HttpError(400, "相对文件路径不合法");
  return value;
}

function normalizeOptionalRelativePath(input: string): string {
  const value = sanitizePath(input);
  return value ? `${value}/` : "";
}

function sanitizePath(input: string): string {
  const trimmed = input.trim().replace(/\\+/g, "/").replace(/^\/+|\/+$/g, "");
  if (!trimmed) return "";
  const out: string[] = [];
  for (const part of trimmed.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") throw new HttpError(400, "路径不能包含 ..");
    out.push(part);
  }
  return out.join("/");
}

function joinPath(basePath: string, relativePath: string): string {
  const base = normalizeDirectoryPath(basePath);
  const relative = sanitizePath(relativePath);
  if (!base) return relative;
  if (!relative) return base;
  return `${base}${relative}`;
}

function baseName(value: string): string {
  const parts = value.replace(/\/+$/, "").split("/");
  return parts[parts.length - 1] || "";
}

function toPositiveInteger(input: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(input || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
