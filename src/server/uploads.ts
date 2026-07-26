import { HttpError } from "./errors.ts";
import { inferContentType } from "./file-http.ts";
import { FOLDER_MARKER } from "./objects.ts";
import { baseName, toPositiveInteger } from "./path.ts";
import { TRASH_PREFIX } from "./storage.ts";
import type { Env } from "./types.ts";

/**
 * R2 分片上传的平台约束：
 * - 除最后一片外，所有片必须等大，且不小于 5 MiB；
 * - 单次上传最多 10000 片。
 *
 * 所以「片大小 × 10000」就是单文件体积上限。默认 16 MiB 一片，约 156 GB。
 *
 * 这条路径存在的原因：旧的 `POST /api/upload` 用 `formData()` 把整个请求体读进
 * Worker 内存，既受单请求体积限制（Free/Pro 100MB），也顶着 128MB 内存上限。
 * 分片以后每个请求只搬一片，请求体和内存都不再是天花板。
 */
export const MIN_PART_BYTES = 5 * 1024 * 1024;
export const DEFAULT_PART_BYTES = 16 * 1024 * 1024;
export const MAX_PART_COUNT = 10_000;

export type UploadConfig = {
  partSize: number;
  maxPartCount: number;
  maxFileBytes: number;
};

export function resolvePartSize(env: Env): number {
  return Math.max(toPositiveInteger(env.UPLOAD_PART_BYTES, DEFAULT_PART_BYTES), MIN_PART_BYTES);
}

export function getUploadConfig(env: Env): UploadConfig {
  const partSize = resolvePartSize(env);
  return { partSize, maxPartCount: MAX_PART_COUNT, maxFileBytes: partSize * MAX_PART_COUNT };
}

/**
 * 挡住写入内部保留路径。
 *
 * 回收站前缀下的对象由 `trash_items` 表统一管理，直接往里写会让记录和实际内容对不上。
 * 文件夹占位标记会被目录列表过滤掉，同名文件传上去就等于人间蒸发。
 */
export function assertWritableFilePath(path: string): string {
  if (path.startsWith(TRASH_PREFIX)) throw new HttpError(400, "不能直接写入回收站目录");
  if (baseName(path) === FOLDER_MARKER) throw new HttpError(400, `文件名不能是内部占位标记 ${FOLDER_MARKER}`);
  return path;
}

export function assertPartNumber(partNumber: number): number {
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > MAX_PART_COUNT) {
    throw new HttpError(400, `分片序号必须是 1 到 ${MAX_PART_COUNT} 之间的整数`);
  }
  return partNumber;
}

/** R2 要求按序号递增提交；客户端并发上传时回来的顺序不一定对。 */
export function sortParts(parts: R2UploadedPart[]): R2UploadedPart[] {
  return [...parts].sort((left, right) => left.partNumber - right.partNumber);
}

export function assertDistinctParts(parts: R2UploadedPart[]): R2UploadedPart[] {
  const seen = new Set<number>();
  for (const part of parts) {
    assertPartNumber(part.partNumber);
    if (seen.has(part.partNumber)) throw new HttpError(400, `分片序号 ${part.partNumber} 重复提交`);
    seen.add(part.partNumber);
  }
  return parts;
}

export async function putDirectObject(env: Env, key: string, body: ReadableStream | null, contentType: string | null) {
  if (!body) throw new HttpError(400, "请求体为空");
  const object = await env.DISK.put(key, body, {
    httpMetadata: { contentType: inferContentType(contentType, key) }
  });
  return { path: object.key, size: object.size };
}

export async function beginMultipartUpload(env: Env, key: string, contentType: string | null) {
  const upload = await env.DISK.createMultipartUpload(key, {
    httpMetadata: { contentType: inferContentType(contentType, key) }
  });
  return { key: upload.key, uploadId: upload.uploadId, partSize: resolvePartSize(env) };
}

export async function uploadMultipartPart(
  env: Env,
  key: string,
  uploadId: string,
  partNumber: number,
  body: ReadableStream | null
) {
  if (!body) throw new HttpError(400, "分片内容为空");
  assertPartNumber(partNumber);
  const part = await env.DISK.resumeMultipartUpload(key, uploadId).uploadPart(partNumber, body);
  return { partNumber: part.partNumber, etag: part.etag };
}

export async function completeMultipartUpload(env: Env, key: string, uploadId: string, parts: R2UploadedPart[]) {
  if (!parts.length) throw new HttpError(400, "分片列表为空");
  const ordered = sortParts(assertDistinctParts(parts));
  const object = await env.DISK.resumeMultipartUpload(key, uploadId).complete(ordered);
  return { path: object.key, size: object.size, parts: ordered.length };
}

export async function abortMultipartUpload(env: Env, key: string, uploadId: string) {
  await env.DISK.resumeMultipartUpload(key, uploadId).abort();
  return { aborted: true, path: key };
}
