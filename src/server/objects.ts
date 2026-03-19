import { HttpError } from "./errors.ts";
import { baseName, joinPath, normalizeRelativeFilePath, toPositiveInteger } from "./path.ts";
import type { Env, ListedFile, ListedFolder } from "./types.ts";

export async function listDirectory(env: Env, prefix: string) {
  const list = await env.DISK.list({ prefix, delimiter: "/", limit: toPositiveInteger(env.MAX_LIST_KEYS, 1000) });
  const folders: ListedFolder[] = (list.delimitedPrefixes || [])
    .map((item) => ({ kind: "folder" as const, name: baseName(item.slice(0, -1)), path: item }))
    .sort((a, b) => a.path.localeCompare(b.path, "zh-CN"));
  const files: ListedFile[] = list.objects
    .filter((item) => item.key !== prefix)
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
    await env.DISK.put(key, upload.stream(), { httpMetadata: { contentType: upload.type || undefined } });
    uploaded += 1;
  }
  return { uploaded };
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

export async function streamObject(env: Env, path: string, download: boolean): Promise<Response> {
  const object = await env.DISK.get(path);
  if (!object) throw new HttpError(404, "文件不存在");
  return objectToResponse(object, baseName(path), download);
}

export async function countDirectoryObjects(env: Env, prefix: string) {
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

export function objectToResponse(object: R2ObjectBody, fileName: string, download: boolean): Response {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag || object.etag);
  headers.set("cache-control", "private, max-age=0, no-store");
  headers.set("content-disposition", `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  return new Response(object.body, { headers });
}
