import { HttpError } from "./errors.ts";

/**
 * 搜索查询的纯逻辑：清洗关键词、构造 SQL LIKE 模式。
 *
 * 单独成文件是为了能脱离 D1 单测——LIKE 通配符转义写错会让搜索结果悄悄变错，
 * 这正是最需要测试覆盖的地方。
 */

export const MIN_QUERY_LENGTH = 1;
export const MAX_QUERY_LENGTH = 200;
export const DEFAULT_SEARCH_LIMIT = 50;
export const MAX_SEARCH_LIMIT = 200;

/**
 * 转义 LIKE 里的特殊字符。
 *
 * `%` 和 `_` 在 LIKE 中是通配符，用户搜「100%」时不转义会变成「以 100 开头的任何东西」。
 * 反斜杠本身也要先转义，否则 `\%` 会被拆错。转义字符靠 SQL 的 `ESCAPE '\'` 声明。
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export function normalizeSearchQuery(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (trimmed.length < MIN_QUERY_LENGTH) throw new HttpError(400, "请输入搜索关键词");
  if (trimmed.length > MAX_QUERY_LENGTH) throw new HttpError(400, `搜索关键词不能超过 ${MAX_QUERY_LENGTH} 个字符`);
  return trimmed;
}

/** 子串匹配模式。关键词统一转小写，配合 `name_lower` 列做大小写不敏感匹配。 */
export function buildSearchPattern(query: string): string {
  return `%${escapeLikePattern(query.toLowerCase())}%`;
}

export function resolveSearchLimit(raw: string | number | null | undefined): number {
  const parsed = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_SEARCH_LIMIT;
  return Math.min(Math.trunc(parsed), MAX_SEARCH_LIMIT);
}

export function resolveSearchOffset(raw: string | number | null | undefined): number {
  const parsed = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.trunc(parsed);
}
