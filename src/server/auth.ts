import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { HttpError } from "./errors.ts";
import type { Env, SessionInfo } from "./types.ts";

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export async function requireAdmin(request: Request, env: Env): Promise<SessionInfo> {
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
