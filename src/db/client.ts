import { drizzle } from "drizzle-orm/d1";
import { HttpError } from "../server/errors.ts";
import type { Env } from "../server/types.ts";
import * as schema from "./schema.ts";

export function getDb(env: Env) {
  if (!env.IMPORTS_DB) throw new HttpError(500, "请先绑定 D1 数据库 IMPORTS_DB");
  return drizzle(env.IMPORTS_DB, { schema });
}