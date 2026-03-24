const GENERIC_CONTENT_TYPES = new Set([
  "application/octet-stream",
  "binary/octet-stream",
  "application/download",
  "application/force-download"
]);

const MIME_BY_EXTENSION: Record<string, string> = {
  apk: "application/vnd.android.package-archive",
  aab: "application/octet-stream",
  xapk: "application/zip",
  ipa: "application/octet-stream",
  exe: "application/vnd.microsoft.portable-executable",
  msi: "application/x-msi",
  dmg: "application/x-apple-diskimage",
  pkg: "application/octet-stream",
  zip: "application/zip",
  rar: "application/vnd.rar",
  '7z': "application/x-7z-compressed",
  tar: "application/x-tar",
  gz: "application/gzip",
  bz2: "application/x-bzip2",
  xz: "application/x-xz",
  pdf: "application/pdf",
  txt: "text/plain; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  json: "application/json; charset=utf-8",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  flac: "audio/flac",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  mp4: "video/mp4",
  webm: "video/webm",
  mkv: "video/x-matroska",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  heic: "image/heic",
  heif: "image/heif"
};

export function inferContentType(currentType: string | null | undefined, fileName: string): string | undefined {
  const normalized = normalizeContentType(currentType);
  if (normalized && !GENERIC_CONTENT_TYPES.has(normalized)) return currentType || normalized;

  const inferred = MIME_BY_EXTENSION[getExtension(fileName)];
  if (inferred) return inferred;
  return normalized || undefined;
}

export function applyDownloadHeaders(headers: Headers, dispositionType: "inline" | "attachment", fileName: string, contentType?: string | null) {
  const resolvedType = inferContentType(contentType, fileName);
  if (resolvedType) headers.set("content-type", resolvedType);
  headers.set("content-disposition", buildContentDisposition(dispositionType, fileName));
}

export function buildContentDisposition(dispositionType: "inline" | "attachment", fileName: string): string {
  const fallback = toAsciiFallback(fileName);
  return `${dispositionType}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function normalizeContentType(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.split(';', 1)[0]?.trim().toLowerCase();
  return normalized || null;
}

function getExtension(fileName: string): string {
  const cleanName = fileName.split(/[?#]/, 1)[0] || fileName;
  const index = cleanName.lastIndexOf('.');
  if (index < 0) return '';
  return cleanName.slice(index + 1).trim().toLowerCase();
}

function toAsciiFallback(fileName: string): string {
  const fallback = fileName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/[\"\\]/g, '_')
    .trim();
  return fallback || 'download';
}
