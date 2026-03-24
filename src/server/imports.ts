import { HttpError } from "./errors.ts";
import { buildContentDisposition, inferContentType } from "./file-http.ts";
import { baseName, joinPath, sanitizePath, toPositiveInteger } from "./path.ts";
import type { Env } from "./types.ts";

export type ImportInput = {
  sourceUrl: string;
  directory: string;
  fileName?: string;
  overwrite?: boolean;
};

const DEFAULT_IMPORT_MAX_BYTES = 512 * 1024 * 1024;

export class RetryableImportError extends HttpError {}

export async function importFromUrl(env: Env, input: ImportInput) {
  const url = parseRemoteUrl(input.sourceUrl);
  assertSafeRemoteUrl(url);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow",
      headers: {
        accept: "*/*"
      }
    });
  } catch (error) {
    throw new RetryableImportError(503, error instanceof Error ? error.message : "远程下载失败");
  }

  if (!response.ok) {
    const message = `远程下载失败：${response.status} ${response.statusText}`;
    if (isRetryableStatus(response.status)) throw new RetryableImportError(response.status, message);
    throw new HttpError(400, message);
  }

  if (!response.body) {
    throw new HttpError(400, "远程响应没有可读取的数据流");
  }

  const maxBytes = toPositiveInteger(env.IMPORT_MAX_BYTES, DEFAULT_IMPORT_MAX_BYTES);
  const contentLength = parseContentLength(response.headers.get("content-length"));
  if (contentLength === null) {
    throw new HttpError(400, "远程源未提供 content-length，当前版本暂不支持导入");
  }
  if (contentLength > maxBytes) {
    throw new HttpError(413, `远程文件过大，限制为 ${formatBytes(maxBytes)}`);
  }

  const resolvedFileName = pickFileName(input.fileName, response.headers.get("content-disposition"), url);
  const targetKey = joinPath(input.directory, resolvedFileName);
  const resolvedContentType = inferContentType(response.headers.get("content-type"), resolvedFileName);

  if (!input.overwrite && (await env.DISK.head(targetKey))) {
    throw new HttpError(409, "目标文件已存在，请改名或启用覆盖");
  }

  const { readable, writable } = new FixedLengthStream(contentLength);
  const pipePromise = response.body.pipeTo(writable);
  try {
    await Promise.all([
      pipePromise,
      env.DISK.put(targetKey, readable, {
        httpMetadata: {
          contentType: resolvedContentType,
          contentDisposition: buildContentDisposition("attachment", resolvedFileName)
        },
        customMetadata: {
          sourceUrl: url.toString(),
          importedAt: new Date().toISOString()
        }
      })
    ]);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new RetryableImportError(503, error instanceof Error ? error.message : "远程导入失败");
  }

  return {
    imported: true,
    path: targetKey,
    fileName: resolvedFileName,
    size: contentLength,
    contentType: resolvedContentType || null,
    sourceUrl: url.toString()
  };
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function parseRemoteUrl(rawUrl: string): URL {
  try {
    const url = new URL(rawUrl.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new HttpError(400, "只支持 http / https 链接");
    }
    return url;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "URL 不合法");
  }
}

function assertSafeRemoteUrl(url: URL) {
  const host = url.hostname.trim().toLowerCase();
  if (!host) throw new HttpError(400, "URL 缺少主机名");
  if (host === "localhost" || host === "0.0.0.0" || host === "::1") {
    throw new HttpError(400, "不允许导入本机地址");
  }

  const ipv4 = parseIpv4(host);
  if (ipv4 && isPrivateIpv4(ipv4)) {
    throw new HttpError(400, "不允许导入内网 IPv4 地址");
  }

  if (isBracketedIpv6(host) || host.includes(":")) {
    const plain = host.replace(/^\[/, "").replace(/\]$/, "");
    if (isPrivateIpv6(plain)) {
      throw new HttpError(400, "不允许导入本地或私有 IPv6 地址");
    }
  }
}

function parseIpv4(host: string): number[] | null {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const values = parts.map((part) => Number.parseInt(part, 10));
  if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return null;
  return values;
}

function isPrivateIpv4(ipv4: number[]): boolean {
  const [a, b] = ipv4;
  return a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function isBracketedIpv6(host: string): boolean {
  return host.startsWith("[") && host.endsWith("]");
}

function isPrivateIpv6(host: string): boolean {
  const normalized = host.toLowerCase();
  return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
}

function parseContentLength(header: string | null): number | null {
  if (!header) return null;
  const value = Number.parseInt(header, 10);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function pickFileName(explicitFileName: string | undefined, contentDisposition: string | null, url: URL): string {
  const candidates = [explicitFileName || "", parseContentDispositionFileName(contentDisposition), baseName(url.pathname), `download-${Date.now()}`];
  for (const candidate of candidates) {
    const safeName = sanitizeFileName(candidate);
    if (safeName) return safeName;
  }
  return `download-${Date.now()}`;
}

function parseContentDispositionFileName(header: string | null): string {
  if (!header) return "";
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  const plainMatch = header.match(/filename="?([^";]+)"?/i);
  return plainMatch ? plainMatch[1] : "";
}

function sanitizeFileName(input: string): string {
  const normalized = sanitizePath(input).replaceAll("/", "-").trim();
  return normalized.replace(/[<>:"|?*]/g, "-").slice(0, 220);
}

function formatBytes(size: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = size;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 100 || index === 0 ? 0 : 1)} ${units[index]}`;
}