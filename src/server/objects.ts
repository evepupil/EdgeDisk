import { HttpError } from "./errors.ts";
import { applyDownloadHeaders, inferContentType } from "./file-http.ts";
import { baseName, joinPath, normalizeRelativeFilePath, toPositiveInteger } from "./path.ts";
import type { Env, ListedFile, ListedFolder } from "./types.ts";

export const FOLDER_MARKER = ".__edgedisk_folder__";

export async function listDirectory(env: Env, prefix: string) {
  const list = await env.DISK.list({ prefix, delimiter: "/", limit: toPositiveInteger(env.MAX_LIST_KEYS, 1000) });
  const folders: ListedFolder[] = (list.delimitedPrefixes || [])
    .map((item) => ({ kind: "folder" as const, name: baseName(item.slice(0, -1)), path: item }))
    .sort((a, b) => a.path.localeCompare(b.path, "zh-CN"));
  const files: ListedFile[] = list.objects
    .filter((item) => item.key !== prefix && baseName(item.key) !== FOLDER_MARKER)
    .map((item) => ({
      kind: "file" as const,
      name: baseName(item.key),
      path: item.key,
      size: item.size,
      uploaded: item.uploaded ? item.uploaded.toISOString() : null,
      etag: item.httpEtag || item.etag || null,
      contentType: item.httpMetadata?.contentType || null
    }))
    .sort((a, b) => a.path.localeCompare(b.path, "zh-CN"));
  return { prefix, folders, files };
}

export async function getObjectDetail(env: Env, path: string) {
  if (path.endsWith("/")) {
    const stats = await countDirectoryObjects(env, path);
    return {
      kind: "folder",
      path,
      name: baseName(path.slice(0, -1)) || "/",
      size: null,
      uploaded: null,
      contentType: null,
      etag: null,
      childCount: stats.childCount,
      totalSize: stats.totalSize
    };
  }

  const head = await env.DISK.head(path);
  if (!head) throw new HttpError(404, "文件不存在");
  return {
    kind: "file",
    path,
    name: baseName(path),
    size: head.size,
    uploaded: head.uploaded ? head.uploaded.toISOString() : null,
    contentType: head.httpMetadata?.contentType || null,
    etag: head.httpEtag || head.etag || null
  };
}

export async function handleUpload(formData: FormData, env: Env, basePath: string) {
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
    await env.DISK.put(key, upload.stream(), { httpMetadata: { contentType: inferContentType(upload.type, key) } });
    uploaded += 1;
  }
  return { uploaded };
}

export async function createFolder(env: Env, folderPath: string) {
  const markerKey = joinPath(folderPath, FOLDER_MARKER);
  const exists = await env.DISK.head(markerKey);
  if (exists) throw new HttpError(409, "文件夹已存在");
  await env.DISK.put(markerKey, new Uint8Array(0), {
    httpMetadata: { contentType: "application/x-edgedisk-folder-placeholder" }
  });
  return { created: true, kind: "folder", path: folderPath };
}

export async function moveObject(env: Env, sourcePath: string, targetPath: string) {
  if (sourcePath === targetPath) throw new HttpError(400, "目标路径不能和原路径相同");

  if (sourcePath.endsWith("/")) {
    if (!targetPath.endsWith("/")) throw new HttpError(400, "文件夹目标路径必须以 / 结尾");
    if (targetPath.startsWith(sourcePath)) throw new HttpError(400, "不能把文件夹移动到自己的子目录中");
    const sourceKeys = await collectObjectKeys(env, sourcePath);
    if (!sourceKeys.length) throw new HttpError(404, "源文件夹不存在");
    const existingTargetKeys = await collectObjectKeys(env, targetPath);
    if (existingTargetKeys.length) throw new HttpError(409, "目标文件夹已存在内容");

    for (const sourceKey of sourceKeys) {
      const suffix = sourceKey.slice(sourcePath.length);
      await copyObject(env, sourceKey, joinPath(targetPath, suffix));
    }
    await env.DISK.delete(sourceKeys);
    return { moved: sourceKeys.length, kind: "folder", path: sourcePath, targetPath };
  }

  const head = await env.DISK.head(sourcePath);
  if (!head) throw new HttpError(404, "源文件不存在");
  if (await env.DISK.head(targetPath)) throw new HttpError(409, "目标文件已存在");
  await copyObject(env, sourcePath, targetPath);
  await env.DISK.delete(sourcePath);
  return { moved: 1, kind: "file", path: sourcePath, targetPath };
}

export async function deleteObject(env: Env, path: string) {
  if (path.endsWith("/")) {
    const keys = await collectObjectKeys(env, path);
    if (keys.length) await env.DISK.delete(keys);
    return { deleted: keys.length, kind: "folder", path };
  }

  const head = await env.DISK.head(path);
  if (!head) throw new HttpError(404, "文件不存在");
  await env.DISK.delete(path);
  return { deleted: 1, kind: "file", path };
}

export async function streamObject(env: Env, path: string, download: boolean, request?: Request): Promise<Response> {
  const head = await env.DISK.head(path);
  if (!head) throw new HttpError(404, "文件不存在");

  const rangeHeader = request?.headers.get("range");
  if (rangeHeader) {
    const range = parseRangeHeader(rangeHeader, head.size);
    if (range === "unsatisfiable") return rangeNotSatisfiable(head.size);
    if (range) {
      const object = await env.DISK.get(path, { range: { offset: range.start, length: range.end - range.start + 1 } });
      if (!object) throw new HttpError(404, "文件不存在");
      return objectToRangeResponse(object, baseName(path), download, range, head.size);
    }
  }

  const object = await env.DISK.get(path);
  if (!object) throw new HttpError(404, "文件不存在");
  return objectToResponse(object, baseName(path), download);
}

type ByteRange = { start: number; end: number };

function parseRangeHeader(header: string, totalSize: number): ByteRange | "unsatisfiable" | null {
  const match = header.match(/^bytes=(\d*)-(\d*)$/i);
  if (!match) return null;

  const rawStart = match[1];
  const rawEnd = match[2];
  if (!rawStart && !rawEnd) return null;

  if (!rawStart) {
    const suffixLength = Number(rawEnd);
    if (Number.isNaN(suffixLength) || suffixLength <= 0) return null;
    const length = Math.min(suffixLength, totalSize);
    return { start: totalSize - length, end: totalSize - 1 };
  }

  const start = Number(rawStart);
  if (Number.isNaN(start) || start < 0) return null;
  if (start >= totalSize) return "unsatisfiable";

  let end = rawEnd ? Number(rawEnd) : totalSize - 1;
  if (Number.isNaN(end) || end < start) return "unsatisfiable";
  end = Math.min(end, totalSize - 1);
  return { start, end };
}

function rangeNotSatisfiable(totalSize: number): Response {
  return new Response(null, {
    status: 416,
    headers: {
      "content-range": `bytes */${totalSize}`,
      "accept-ranges": "bytes",
      "cache-control": "private, max-age=0, no-store"
    }
  });
}

function objectToRangeResponse(object: R2ObjectBody, fileName: string, download: boolean, range: ByteRange, totalSize: number): Response {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag || object.etag);
  headers.set("accept-ranges", "bytes");
  headers.set("content-range", `bytes ${range.start}-${range.end}/${totalSize}`);
  headers.set("content-length", String(range.end - range.start + 1));
  headers.set("cache-control", "private, max-age=0, no-store");
  applyDownloadHeaders(headers, download ? "attachment" : "inline", fileName, object.httpMetadata?.contentType);
  return new Response(object.body, { status: 206, headers });
}

export async function countDirectoryObjects(env: Env, prefix: string) {
  let cursor: string | undefined;
  let childCount = 0;
  let totalSize = 0;
  do {
    const batch = await env.DISK.list({ prefix, cursor, limit: 1000 });
    for (const object of batch.objects) {
      if (baseName(object.key) === FOLDER_MARKER) continue;
      childCount += 1;
      totalSize += object.size;
    }
    cursor = batch.truncated ? batch.cursor : undefined;
  } while (cursor);
  return { childCount, totalSize };
}

export async function collectObjectKeys(env: Env, prefix: string): Promise<string[]> {
  let cursor: string | undefined;
  const keys: string[] = [];
  do {
    const batch = await env.DISK.list({ prefix, cursor, limit: 1000 });
    for (const object of batch.objects) keys.push(object.key);
    cursor = batch.truncated ? batch.cursor : undefined;
  } while (cursor);
  return keys;
}

async function copyObject(env: Env, sourceKey: string, targetKey: string) {
  const object = await env.DISK.get(sourceKey);
  if (!object) throw new HttpError(404, `对象不存在：${sourceKey}`);
  await env.DISK.put(targetKey, object.body, {
    httpMetadata: object.httpMetadata,
    customMetadata: object.customMetadata
  });
}

export function objectToResponse(object: R2ObjectBody, fileName: string, download: boolean): Response {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag || object.etag);
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "private, max-age=0, no-store");
  applyDownloadHeaders(headers, download ? "attachment" : "inline", fileName, object.httpMetadata?.contentType);
  return new Response(object.body, { headers });
}