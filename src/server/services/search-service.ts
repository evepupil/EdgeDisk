import { HttpError } from '../errors.ts'
import { FOLDER_MARKER, MAX_LIST_PAGE_SIZE } from '../objects.ts'
import { baseName } from '../path.ts'
import {
  clearFileIndex,
  getIndexStats,
  searchIndexedFiles,
  upsertIndexedFiles,
  type IndexedFileInput
} from '../repos/file-index-repo.ts'
import { buildSearchPattern, normalizeSearchQuery, resolveSearchLimit, resolveSearchOffset } from '../search-query.ts'
import { TRASH_PREFIX } from '../storage.ts'
import type { Env } from '../types.ts'

/** 一次 reindex 请求最多扫多少页 R2，避免单个请求超时。剩余部分靠返回的游标继续。 */
const REINDEX_PAGES_PER_REQUEST = 20

function requireIndexDb(env: Env): void {
  if (!env.IMPORTS_DB) throw new HttpError(500, '搜索需要绑定 D1 数据库 IMPORTS_DB')
}

export async function searchFiles(env: Env, rawQuery: string | null, rawLimit: string | null, rawOffset: string | null) {
  requireIndexDb(env)
  const query = normalizeSearchQuery(rawQuery)
  const limit = resolveSearchLimit(rawLimit)
  const offset = resolveSearchOffset(rawOffset)
  const { files, hasMore } = await searchIndexedFiles(env, buildSearchPattern(query), limit, offset)

  return {
    query,
    limit,
    offset,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
    files: files.map((file) => ({
      kind: 'file' as const,
      name: file.name,
      path: file.path,
      directory: file.directory,
      size: file.size,
      uploaded: file.uploaded,
      etag: null,
      contentType: file.contentType
    }))
  }
}

export async function getStorageStats(env: Env) {
  requireIndexDb(env)
  return await getIndexStats(env)
}

/**
 * 从 R2 全量重建索引。
 *
 * 两个用途：给存量数据做首次回填，以及在怀疑索引漂移时恢复。分页进行，
 * `cursor` 为空时表示从头开始并先清空旧索引。
 */
export async function reindexFiles(env: Env, rawCursor: string | null) {
  requireIndexDb(env)
  const startingOver = !rawCursor
  if (startingOver) await clearFileIndex(env)

  let cursor = rawCursor || undefined
  let indexed = 0
  let scanned = 0

  for (let page = 0; page < REINDEX_PAGES_PER_REQUEST; page += 1) {
    const listOptions: R2ListOptions = { limit: MAX_LIST_PAGE_SIZE }
    if (cursor) listOptions.cursor = cursor
    const batch = await env.DISK.list(listOptions)
    scanned += batch.objects.length

    const inputs: IndexedFileInput[] = batch.objects
      .filter((object) => isIndexableKey(object.key))
      .map((object) => ({
        path: object.key,
        size: object.size,
        contentType: object.httpMetadata?.contentType || null,
        uploaded: object.uploaded ? object.uploaded.toISOString() : null
      }))
    indexed += await upsertIndexedFiles(env, inputs)

    if (!batch.truncated) {
      return { done: true, cursor: null, indexed, scanned, restarted: startingOver }
    }
    cursor = batch.cursor
  }

  return { done: false, cursor: cursor ?? null, indexed, scanned, restarted: startingOver }
}

/**
 * 哪些 R2 键不该进索引。
 *
 * 回收站里的对象已经被用户删掉了，出现在搜索结果里会让人以为文件还在原处。
 * 文件夹占位标记是内部实现细节，本来就被目录列表过滤掉。
 */
export function isIndexableKey(key: string): boolean {
  if (!key || key.endsWith('/')) return false
  if (key.startsWith(TRASH_PREFIX)) return false
  if (baseName(key) === FOLDER_MARKER) return false
  return true
}
