import { requireAdmin } from "./auth.ts";
import { HttpError } from "./errors.ts";
import { html, json } from "./http.ts";
import { deleteObject, getObjectDetail, handleUpload, listDirectory, streamObject } from "./objects.ts";
import { normalizeAnyPath, normalizeDirectoryPath, normalizeFilePath, normalizeOptionalRelativePath, parseOptionalNonNegativeNumber, parseShareKind } from "./path.ts";
import { createShare, getShareRecord, getShareView, listSharesByTarget, revokeShare, revokeSharesForPath, streamSharedObject } from "./shares.ts";
import type { Env } from "./types.ts";
import { renderDashboardHtml } from "../views/dashboard.ts";
import { renderShareHtml } from "../views/share.ts";

export async function routeRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/") return Response.redirect(`${url.origin}/app`, 302);

  if (path === "/app") {
    await requireAdmin(request, env);
    return html(renderDashboardHtml({ appName: env.APP_NAME || "EdgeDisk" }));
  }

  if (path === "/api/session") return json(await requireAdmin(request, env));

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
    const targetPath = normalizeAnyPath(rawPath);
    const result = await deleteObject(env, targetPath);
    const revokedShares = await revokeSharesForPath(env, targetPath, targetPath.endsWith("/"));
    return json({ ...result, revokedShares });
  }

  if (path === "/api/file") {
    await requireAdmin(request, env);
    const rawPath = url.searchParams.get("path");
    if (!rawPath) throw new HttpError(400, "缺少 path 参数");
    return streamObject(env, normalizeFilePath(rawPath), url.searchParams.get("download") === "1");
  }

  if (path === "/api/upload" && request.method === "POST") {
    await requireAdmin(request, env);
    const formData = await request.formData();
    const basePath = normalizeDirectoryPath(String(formData.get("basePath") || ""));
    return json(await handleUpload(formData, env, basePath), 201);
  }

  if (path === "/api/share" && request.method === "POST") {
    const session = await requireAdmin(request, env);
    const payload = await request.json<Record<string, unknown>>();
    const kind = parseShareKind(payload.kind);
    const rawPath = String(payload.path || "");
    const expiresInDays = parseOptionalNonNegativeNumber(payload.expiresInDays);
    if (!rawPath) throw new HttpError(400, "分享参数不完整");
    const normalizedPath = kind === "folder" ? normalizeDirectoryPath(rawPath) : normalizeFilePath(rawPath);
    return json(await createShare(env, session.email, kind, normalizedPath, expiresInDays, url.origin), 201);
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
