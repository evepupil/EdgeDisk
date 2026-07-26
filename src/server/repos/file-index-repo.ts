import { count, eq, inArray, sql, sum } from 'drizzle-orm'
import { getDb } from '../../db/client.ts'
import { fileIndex, type FileIndexRow } from '../../db/schema.ts'
import { baseName } from '../path.ts'
import { escapeLikePattern } from '../search-query.ts'
import type { Env } from '../types.ts'

/**
 * 文件索引的唯一写入口。
 *
 * 所有改动 R2 对象的代码路径都必须经过这里。漏掉任何一处，搜索就会静默少东西或多东西——
 * 和目录列表被截断是同一类问题。为了让漂移可恢复，另有 reindex 从 R2 全量重建。
 *
 * `env.IMPORTS_DB` 没绑定时所有函数静默跳过：索引是增强功能，不该让上传本身失败。
 */

export type IndexedFileInput = {
  path: string
  size: number
  contentType: string | null
  uploaded: string | null
}

export type IndexedFile = {
  path: string
  name: string
  directory: string
  size: number
  contentType: string | null
  uploaded: string | null
}

function directoryOf(path: string): string {
  const separator = path.lastIndexOf('/')
  return separator < 0 ? '' : path.slice(0, separator + 1)
}

function toRow(input: IndexedFileInput, indexedAt: string) {
  const name = baseName(input.path)
  return {
    path: input.path,
    name,
    nameLower: name.toLowerCase(),
    directory: directoryOf(input.path),
    size: input.size,
    contentType: input.contentType,
    uploaded: input.uploaded,
    indexedAt
  }
}

function serialize(row: FileIndexRow): IndexedFile {
  return {
    path: row.path,
    name: row.name,
    directory: row.directory,
    size: row.size,
    contentType: row.contentType,
    uploaded: row.uploaded
  }
}

const CONFLICT_UPDATE = {
  name: sql`excluded.name`,
  nameLower: sql`excluded.name_lower`,
  directory: sql`excluded.directory`,
  size: sql`excluded.size`,
  contentType: sql`excluded.content_type`,
  uploaded: sql`excluded.uploaded`,
  indexedAt: sql`excluded.indexed_at`
}

export async function upsertIndexedFile(env: Env, input: IndexedFileInput): Promise<void> {
  if (!env.IMPORTS_DB) return
  const db = getDb(env)
  const row = toRow(input, new Date().toISOString())
  await db.insert(fileIndex).values(row).onConflictDoUpdate({ target: fileIndex.path, set: CONFLICT_UPDATE })
}

export async function upsertIndexedFiles(env: Env, inputs: readonly IndexedFileInput[]): Promise<number> {
  if (!env.IMPORTS_DB || !inputs.length) return 0
  const db = getDb(env)
  const indexedAt = new Date().toISOString()
  // D1 单条语句的绑定参数有上限，每行 8 个参数，按 100 行一批写入留足余量。
  const BATCH = 100
  for (let start = 0; start < inputs.length; start += BATCH) {
    const rows = inputs.slice(start, start + BATCH).map((input) => toRow(input, indexedAt))
    await db.insert(fileIndex).values(rows).onConflictDoUpdate({ target: fileIndex.path, set: CONFLICT_UPDATE })
  }
  return inputs.length
}

export async function deleteIndexedFile(env: Env, path: string): Promise<void> {
  if (!env.IMPORTS_DB) return
  const db = getDb(env)
  await db.delete(fileIndex).where(eq(fileIndex.path, path))
}

export async function deleteIndexedFiles(env: Env, paths: readonly string[]): Promise<void> {
  if (!env.IMPORTS_DB || !paths.length) return
  const db = getDb(env)
  const BATCH = 200
  for (let start = 0; start < paths.length; start += BATCH) {
    await db.delete(fileIndex).where(inArray(fileIndex.path, paths.slice(start, start + BATCH)))
  }
}

/** 删除某个前缀下的全部索引，用于文件夹删除与移动。 */
export async function deleteIndexedFilesByPrefix(env: Env, prefix: string): Promise<void> {
  if (!env.IMPORTS_DB) return
  const db = getDb(env)
  const pattern = `${escapeLikePattern(prefix)}%`
  await db.delete(fileIndex).where(sql`${fileIndex.path} LIKE ${pattern} ESCAPE '\\'`)
}

export async function searchIndexedFiles(
  env: Env,
  pattern: string,
  limit: number,
  offset: number
): Promise<{ files: IndexedFile[]; hasMore: boolean }> {
  if (!env.IMPORTS_DB) return { files: [], hasMore: false }
  const db = getDb(env)
  // 多取一条来判断还有没有下一页，省掉一次 COUNT 查询。
  const rows = await db
    .select()
    .from(fileIndex)
    .where(sql`${fileIndex.nameLower} LIKE ${pattern} ESCAPE '\\'`)
    .orderBy(fileIndex.nameLower, fileIndex.path)
    .limit(limit + 1)
    .offset(offset)

  return { files: rows.slice(0, limit).map(serialize), hasMore: rows.length > limit }
}

export async function getIndexStats(env: Env): Promise<{ files: number; totalSize: number }> {
  if (!env.IMPORTS_DB) return { files: 0, totalSize: 0 }
  const db = getDb(env)
  const rows = await db.select({ files: count(), totalSize: sum(fileIndex.size) }).from(fileIndex)
  const row = rows[0]
  return { files: Number(row?.files ?? 0), totalSize: Number(row?.totalSize ?? 0) }
}

export async function clearFileIndex(env: Env): Promise<void> {
  if (!env.IMPORTS_DB) return
  const db = getDb(env)
  await db.delete(fileIndex).where(sql`1 = 1`)
}
