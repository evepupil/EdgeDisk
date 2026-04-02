import { HttpError } from './errors.ts'
import { FOLDER_MARKER } from './objects.ts'
import { baseName, joinPath, normalizeAnyPath, normalizeDirectoryPath } from './path.ts'
import { deleteTrashItemRow, findTrashItemRow, insertTrashItem, listTrashItemRows } from './repos/trash-repo.ts'
import { TRASH_PREFIX } from './storage.ts'
import type { Env, TrashItem } from './types.ts'

export async function moveToTrash(env: Env, path: string, deletedBy: string) {
  const itemId = createTrashId()
  const storagePrefix = `${TRASH_PREFIX}${itemId}/`
  const deletedAt = new Date().toISOString()

  if (path.endsWith('/')) {
    const keys = await collectObjectKeys(env, path)
    if (!keys.length) throw new HttpError(404, '\u6e90\u6587\u4ef6\u5939\u4e0d\u5b58\u5728')

    let totalSize = 0
    for (const sourceKey of keys) {
      const object = await env.DISK.get(sourceKey)
      if (!object) continue
      const suffix = sourceKey.slice(path.length)
      const targetKey = joinPath(storagePrefix, suffix)
      totalSize += Number(object.size || 0)
      await env.DISK.put(targetKey, object.body, {
        httpMetadata: object.httpMetadata,
        customMetadata: object.customMetadata
      })
    }
    await env.DISK.delete(keys)

    await insertTrashItem(env, {
      id: itemId,
      kind: 'folder',
      originalPath: path,
      storagePrefix,
      deletedBy,
      deletedAt,
      itemCount: keys.filter((key) => baseName(key) !== FOLDER_MARKER).length,
      totalSize,
      contentType: null
    })

    return { trashed: keys.length, kind: 'folder', path, itemId }
  }

  const head = await env.DISK.head(path)
  if (!head) throw new HttpError(404, '\u6587\u4ef6\u4e0d\u5b58\u5728')
  const object = await env.DISK.get(path)
  if (!object) throw new HttpError(404, '\u6587\u4ef6\u4e0d\u5b58\u5728')
  const trashKey = joinPath(storagePrefix, baseName(path))
  await env.DISK.put(trashKey, object.body, {
    httpMetadata: object.httpMetadata,
    customMetadata: object.customMetadata
  })
  await env.DISK.delete(path)

  await insertTrashItem(env, {
    id: itemId,
    kind: 'file',
    originalPath: path,
    storagePrefix,
    deletedBy,
    deletedAt,
    itemCount: 1,
    totalSize: head.size,
    contentType: head.httpMetadata?.contentType || null
  })

  return { trashed: 1, kind: 'file', path, itemId }
}

export async function listTrashItems(env: Env, limit: number | null): Promise<TrashItem[]> {
  const rows = await listTrashItemRows(env, limit && limit > 0 ? limit : 50)
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    originalPath: row.originalPath,
    storagePrefix: row.storagePrefix,
    deletedBy: row.deletedBy,
    deletedAt: row.deletedAt,
    itemCount: Number(row.itemCount || 0),
    totalSize: Number(row.totalSize || 0),
    contentType: row.contentType || null
  }))
}

export async function restoreTrashItem(env: Env, itemId: string) {
  const item = await getRequiredTrashItem(env, itemId)
  const originalPath = item.kind === 'folder' ? normalizeDirectoryPath(item.originalPath) : normalizeAnyPath(item.originalPath)

  if (item.kind === 'folder') {
    const existing = await collectObjectKeys(env, originalPath)
    if (existing.length) throw new HttpError(409, '\u539f\u4f4d\u7f6e\u5df2\u5b58\u5728\u5185\u5bb9\uff0c\u65e0\u6cd5\u6062\u590d\u6587\u4ef6\u5939')
    const trashKeys = await collectObjectKeys(env, item.storagePrefix)
    if (!trashKeys.length) throw new HttpError(404, '\u56de\u6536\u7ad9\u5bf9\u8c61\u5df2\u4e0d\u5b58\u5728')

    for (const trashKey of trashKeys) {
      const object = await env.DISK.get(trashKey)
      if (!object) continue
      const suffix = trashKey.slice(item.storagePrefix.length)
      const targetKey = joinPath(originalPath, suffix)
      await env.DISK.put(targetKey, object.body, {
        httpMetadata: object.httpMetadata,
        customMetadata: object.customMetadata
      })
    }
    await env.DISK.delete(trashKeys)
    await deleteTrashItemRow(env, itemId)
    return { restored: trashKeys.length, kind: 'folder', path: originalPath }
  }

  if (await env.DISK.head(originalPath)) throw new HttpError(409, '\u539f\u4f4d\u7f6e\u5df2\u5b58\u5728\u540c\u540d\u6587\u4ef6\uff0c\u65e0\u6cd5\u6062\u590d')
  const trashKeys = await collectObjectKeys(env, item.storagePrefix)
  const trashKey = trashKeys[0]
  if (!trashKey) throw new HttpError(404, '\u56de\u6536\u7ad9\u5bf9\u8c61\u5df2\u4e0d\u5b58\u5728')
  const object = await env.DISK.get(trashKey)
  if (!object) throw new HttpError(404, '\u56de\u6536\u7ad9\u5bf9\u8c61\u5df2\u4e0d\u5b58\u5728')
  await env.DISK.put(originalPath, object.body, {
    httpMetadata: object.httpMetadata,
    customMetadata: object.customMetadata
  })
  await env.DISK.delete(trashKeys)
  await deleteTrashItemRow(env, itemId)
  return { restored: 1, kind: 'file', path: originalPath }
}

export async function permanentlyDeleteTrashItem(env: Env, itemId: string) {
  const item = await getRequiredTrashItem(env, itemId)
  const trashKeys = await collectObjectKeys(env, item.storagePrefix)
  if (trashKeys.length) await env.DISK.delete(trashKeys)
  await deleteTrashItemRow(env, itemId)
  return { deleted: trashKeys.length, kind: item.kind, path: item.originalPath }
}

async function getRequiredTrashItem(env: Env, itemId: string) {
  const item = await findTrashItemRow(env, itemId)
  if (!item) throw new HttpError(404, '\u56de\u6536\u7ad9\u6761\u76ee\u4e0d\u5b58\u5728')
  return item
}

async function collectObjectKeys(env: Env, prefix: string): Promise<string[]> {
  let cursor: string | undefined
  const keys: string[] = []
  do {
    const batch = await env.DISK.list({ prefix, cursor, limit: 1000 })
    for (const object of batch.objects) keys.push(object.key)
    cursor = batch.truncated ? batch.cursor : undefined
  } while (cursor)
  return keys
}

function createTrashId() {
  return `trash_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function isTrashPath(path: string) {
  return path.startsWith(TRASH_PREFIX)
}

export function getTrashPrefix() {
  return TRASH_PREFIX
}
