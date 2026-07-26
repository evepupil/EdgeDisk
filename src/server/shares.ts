import { HttpError } from "./errors.ts";
import { baseName, encodePathForShareKey, joinPath, normalizeRelativeFilePath } from "./path.ts";
import { resolveListPageSize, streamObject } from "./objects.ts";
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

/**
 * 分享是否已过期。
 *
 * KV 的 `put` 没有用 `expirationTtl`，过期判断完全在应用层做，所以每个读路径
 * 都必须走这个判断，并顺手把过期记录清掉。
 */
export function isExpiredShare(record: ShareRecord, now = Date.now()): boolean {
  if (!record.expiresAt) return false;
  const expiresAt = new Date(record.expiresAt).getTime();
  if (Number.isNaN(expiresAt)) return false;
  return expiresAt <= now;
}

export async function getShareRecord(env: Env, shareCode: string): Promise<ShareRecord> {
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(shareCode)) throw new HttpError(404, "分享不存在");
  const raw = await env.SHARES.get(shareStorageKey(shareCode));
  if (!raw) throw new HttpError(404, "分享不存在或已失效");

  const record = JSON.parse(raw) as ShareRecord;
  if (isExpiredShare(record)) {
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

export async function getShareView(env: Env, shareCode: string, sub: string, origin: string, cursor?: string | null) {
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
  const listOptions: R2ListOptions = { prefix: currentPrefix, delimiter: "/", limit: resolveListPageSize(env) };
  if (cursor) listOptions.cursor = cursor;
  const list = await env.DISK.list(listOptions);
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
    files,
    cursor: list.truncated ? list.cursor : null,
    truncated: list.truncated
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
  const prefixes = shareTargetSearchPrefixes(path, recursiveFolder);

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

/**
 * 移动对象后修正受影响分享的目标路径。
 *
 * 以前这里全量扫 `share:` 键空间，于是每次移动的 KV 读取次数等于系统里的分享总数，
 * 哪怕被移动的路径根本没有分享。现在改走 `share-target:` 反向索引，只读真正相关的分享。
 */
export async function retargetSharesForMove(env: Env, sourcePath: string, targetPath: string, recursiveFolder: boolean): Promise<number> {
  const prefixes = shareTargetSearchPrefixes(sourcePath, recursiveFolder);

  const seen = new Set<string>();
  let updated = 0;
  for (const prefix of prefixes) {
    const codes = await collectShareCodesByPrefix(env, prefix);
    for (const code of codes) {
      if (seen.has(code)) continue;
      seen.add(code);

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
  }

  return updated;
}

export type ShareListEntry = {
  code: string;
  url: string;
  kind: ShareKind;
  path: string;
  createdAt: string;
  expiresAt: string | null;
  createdBy: string | null;
};

/**
 * 枚举全部分享。
 *
 * 直接用 KV 的前缀游标翻页，不额外维护一份索引——KV 的 `list` 本身就是可靠的全量枚举，
 * 多一份索引就多一份漂移风险。顺路把读到的过期分享清掉。
 */
export async function listAllShares(
  env: Env,
  origin: string,
  options: { cursor?: string | null; limit?: number | null } = {}
): Promise<{ shares: ShareListEntry[]; expiredRemoved: number; cursor: string | null; truncated: boolean }> {
  const requested = options.limit;
  const limit = typeof requested === "number" && Number.isFinite(requested) && requested > 0
    ? Math.min(Math.trunc(requested), 1000)
    : 200;

  const listOptions: KVNamespaceListOptions = { prefix: SHARE_KEY_PREFIX, limit };
  if (options.cursor) listOptions.cursor = options.cursor;
  const batch = await env.SHARES.list(listOptions);

  const shares: ShareListEntry[] = [];
  let expiredRemoved = 0;
  for (const key of batch.keys) {
    const code = key.name.slice(SHARE_KEY_PREFIX.length);
    const record = await getShareRecordRaw(env, code);
    if (!record) continue;
    if (isExpiredShare(record)) {
      await revokeShare(env, code, record);
      expiredRemoved += 1;
      continue;
    }
    shares.push({
      code,
      url: `${origin}/s/${code}`,
      kind: record.kind,
      path: record.path,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      createdBy: record.createdBy || null
    });
  }

  shares.sort((left, right) => right.createdAt.localeCompare(left.createdAt, "zh-CN"));
  return {
    shares,
    expiredRemoved,
    cursor: batch.list_complete ? null : batch.cursor,
    truncated: !batch.list_complete
  };
}

export async function revokeSharesBatch(env: Env, codes: readonly string[]): Promise<{ revoked: number; missing: string[] }> {
  const missing: string[] = [];
  let revoked = 0;
  for (const code of new Set(codes)) {
    if (await revokeShare(env, code)) revoked += 1;
    else missing.push(code);
  }
  return { revoked, missing };
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

const SHARE_KEY_PREFIX = "share:";

function shareStorageKey(code: string): string {
  return `${SHARE_KEY_PREFIX}${code}`;
}

function shareTargetIndexKey(kind: ShareKind, path: string, code: string): string {
  return `${shareTargetIndexPrefix(kind, path)}${code}`;
}

function shareTargetIndexPrefix(kind: ShareKind, path: string): string {
  return `share-target:${kind}:${encodePathForShareKey(path)}|`;
}

/**
 * 找出可能受某个路径影响的分享，用 KV 前缀匹配。
 *
 * 文件夹场景要连带子孙：路径经过 `encodeURIComponent` 后，`A/` 变成 `A%2F`，
 * 而嵌套的 `A/b/c.txt` 变成 `A%2Fb%2Fc.txt`，仍然以 `A%2F` 开头，所以去掉结尾的
 * `|` 做前缀查询就能一并覆盖。兄弟目录 `Ax/` 编码成 `Ax%2F`，不会被误命中。
 */
function shareTargetSearchPrefixes(path: string, recursiveFolder: boolean): string[] {
  return recursiveFolder
    ? [`share-target:file:${encodePathForShareKey(path)}`, `share-target:folder:${encodePathForShareKey(path)}`]
    : [shareTargetIndexPrefix("file", path)];
}

export function computeRetargetedSharePath(recordPath: string, sourcePath: string, targetPath: string, recursiveFolder: boolean): string | null {
  if (!recursiveFolder) {
    return recordPath === sourcePath ? targetPath : null;
  }

  if (!recordPath.startsWith(sourcePath)) {
    return null;
  }

  return `${targetPath}${recordPath.slice(sourcePath.length)}`;
}
