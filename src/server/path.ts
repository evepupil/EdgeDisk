import { HttpError } from "./errors.ts";
import type { ShareKind } from "./types.ts";

export function normalizeAnyPath(input: string): string {
  const value = sanitizePath(input);
  if (!value) throw new HttpError(400, "路径不能为空");
  return input.trim().endsWith("/") ? `${value}/` : value;
}

export function normalizeFilePath(input: string): string {
  const value = sanitizePath(input);
  if (!value || value.endsWith("/")) throw new HttpError(400, "文件路径不合法");
  return value;
}

export function normalizeDirectoryPath(input: string): string {
  const value = sanitizePath(input);
  return value ? `${value}/` : "";
}

export function normalizeRelativeFilePath(input: string): string {
  const value = sanitizePath(input);
  if (!value || value.endsWith("/")) throw new HttpError(400, "相对文件路径不合法");
  return value;
}

export function normalizeOptionalRelativePath(input: string): string {
  const value = sanitizePath(input);
  return value ? `${value}/` : "";
}

export function sanitizePath(input: string): string {
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

export function joinPath(basePath: string, relativePath: string): string {
  const base = normalizeDirectoryPath(basePath);
  const relative = sanitizePath(relativePath);
  if (!base) return relative;
  if (!relative) return base;
  return `${base}${relative}`;
}

export function baseName(value: string): string {
  const parts = value.replace(/\/+$/, "").split("/");
  return parts[parts.length - 1] || "";
}

export function toPositiveInteger(input: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(input || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseShareKind(value: unknown): ShareKind {
  if (value === "folder") return "folder";
  if (value === "file") return "file";
  throw new HttpError(400, "分享类型不合法");
}

export function parseOptionalNonNegativeNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(parsed) || parsed < 0) throw new HttpError(400, "过期时间不合法");
  return parsed;
}

export function encodePathForShareKey(path: string): string {
  return encodeURIComponent(path);
}
