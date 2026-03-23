import { HttpError } from "./errors.ts";
import { baseName, encodePathForShareKey, joinPath, normalizeRelativeFilePath, toPositiveInteger } from "./path.ts";
import { streamObject } from "./objects.ts";
import type { Env, ListedFile, ListedFolder, ShareKind, ShareRecord } from "./types.ts";

export async function createShare(env: Env, createdBy: string, kind: ShareKind, path: string, expiresInDays: number | null, origin: string) {
  if (kind === "file") {
    if (!(await env.DISK.head(path))) throw new HttpError(404, "待分享文件不存在");
  } else {
    const check = await env.DISK.list({ prefix: path, limit: 1 });
    if (!check.objects.length && !(check.delimitedPrefixes || []).length) throw new HttpError(404, "待分享文件夹不存在或为空");
  }

  const code = await generateShareCode(env);
  const record: ShareRecord = {
    kind,
    path,
    createdAt: new Date().toISOString(),
    expiresAt: expiresInDays && expiresInDays > 0 ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString() : null,
    createdBy
  };

  await env.SHARES.put(shareStorageKey(code), JSON.stringify(record));
  await env.SHARES.put(shareTargetIndexKey(kind, path, code), "1");
  return { code, url: `${origin}/s/${code}`, record };
}

export async function listSharesByTarget(env: Env, kind: ShareKind, path: string, origin: string) {
  const codes = await collectShareCodesByPrefix(env, shareTargetIndexPrefix(kind, path));
  const shares: Array<Record<string, string | null>> = [];

  for (const code of codes) {
    try {
      const record = await getShareRecord(env, code);
      shares.push({
        code,
        url: `${origin}/s/${code}`,
        kind: record.kind,
        path: record.path,
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
        createdBy: record.createdBy || null
      });
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 404)) throw error;
    }
  }

  shares.sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt), "zh-CN"));
  return shares;
}

export async function getShareRecord(env: Env, shareCode: string): Promise<ShareRecord> {
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

export async function revokeShare(env: Env, shareCode: string, knownRecord?: ShareRecord): Promise<boolean> {
  const record = knownRecord || (await getShareRecordRaw(env, shareCode));
  if (!record) return false;
  await env.SHARES.delete(shareStorageKey(shareCode));
  await env.SHARES.delete(shareTargetIndexKey(record.kind, record.path, shareCode));
  return true;
}

export async function getShareView(env: Env, shareCode: string, sub: string, origin: string) {
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
      file: {
        name: baseName(share.path),
        size: head.size,
        uploaded: head.uploaded ? head.uploaded.toISOString() : null,
        etag: head.httpEtag || head.etag || null,
        contentType: head.httpMetadata?.contentType || null
      }
    };
  }

  const currentPrefix = joinPath(share.path, sub);
  const list = await env.DISK.list({ prefix: currentPrefix, delimiter: "/", limit: toPositiveInteger(env.MAX_LIST_KEYS, 1000) });
  const folders: ListedFolder[] = (list.delimitedPrefixes || [])
    .map((item) => ({ kind: "folder" as const, name: baseName(item.slice(0, -1)), path: item, subpath: item.slice(share.path.length) }))
    .sort((a, b) => a.path.localeCompare(b.path, "zh-CN"));
  const files: ListedFile[] = list.objects
    .filter((item) => item.key !== currentPrefix)
    .map((item) => ({
      kind: "file" as const,
      name: baseName(item.key),
      path: item.key,
      subpath: item.key.slice(share.path.length),
      size: item.size,
      uploaded: item.uploaded ? item.uploaded.toISOString() : null,
      etag: item.httpEtag || item.etag || null,
      contentType: item.httpMetadata?.contentType || null
    }))
    .sort((a, b) => a.path.localeCompare(b.path, "zh-CN"));

  return {
    kind: "folder",
    shareCode,
    shareUrl: `${origin}/s/${shareCode}`,
    rootPath: share.path,
    currentPrefix,
    createdAt: share.createdAt,
    expiresAt: share.expiresAt,
    folders,
    files
  };
}

export async function streamSharedObject(env: Env, shareCode: string, rawRelativePath: string | null, download: boolean, request?: Request): Promise<Response> {
  const share = await getShareRecord(env, shareCode);
  let key = share.path;
  if (share.kind === "folder") {
    if (!rawRelativePath) throw new HttpError(400, "文件夹分享下载时需要 path 参数");
    key = joinPath(share.path, normalizeRelativeFilePath(rawRelativePath));
  }

  return streamObject(env, key, download, request);
}

export async function revokeSharesForPath(env: Env, path: string, recursiveFolder: boolean): Promise<number> {
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

export async function retargetSharesForMove(env: Env, sourcePath: string, targetPath: string, recursiveFolder: boolean): Promise<number> {
  let cursor: string | undefined;
  let updated = 0;

  do {
    const batch = await env.SHARES.list({ prefix: "share:", cursor, limit: 1000 });
    for (const key of batch.keys) {
      const code = key.name.slice("share:".length);
      const record = await getShareRecordRaw(env, code);
      if (!record) continue;

      const nextPath = computeRetargetedSharePath(record.path, sourcePath, targetPath, recursiveFolder);
      if (!nextPath) continue;

      await env.SHARES.delete(shareTargetIndexKey(record.kind, record.path, code));
      record.path = nextPath;
      await env.SHARES.put(shareStorageKey(code), JSON.stringify(record));
      await env.SHARES.put(shareTargetIndexKey(record.kind, record.path, code), "1");
      updated += 1;
    }
    cursor = batch.list_complete ? undefined : batch.cursor;
  } while (cursor);

  return updated;
}

async function getShareRecordRaw(env: Env, shareCode: string): Promise<ShareRecord | null> {
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(shareCode)) return null;
  const raw = await env.SHARES.get(shareStorageKey(shareCode));
  return raw ? (JSON.parse(raw) as ShareRecord) : null;
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

function shareTargetIndexKey(kind: ShareKind, path: string, code: string): string {
  return `${shareTargetIndexPrefix(kind, path)}${code}`;
}

function shareTargetIndexPrefix(kind: ShareKind, path: string): string {
  return `share-target:${kind}:${encodePathForShareKey(path)}|`;
}

function computeRetargetedSharePath(recordPath: string, sourcePath: string, targetPath: string, recursiveFolder: boolean): string | null {
  if (!recursiveFolder) {
    return recordPath === sourcePath ? targetPath : null;
  }

  if (!recordPath.startsWith(sourcePath)) {
    return null;
  }

  return `${targetPath}${recordPath.slice(sourcePath.length)}`;
}
