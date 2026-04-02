import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { requireAdmin } from './auth'
import { HttpError, respondError } from './errors'
import { createImportTask, listImportTasks } from './services/import-service.ts'
import { createFolder, getObjectDetail, handleUpload, listDirectory, moveObject, streamObject } from './objects'
import { normalizeAnyPath, normalizeDirectoryPath, normalizeFilePath, parseOptionalNonNegativeNumber } from './path'
import { createShare, listSharesByTarget, retargetSharesForMove, revokeShare, revokeSharesForPath } from './shares'
import { listTrashItems, moveToTrash, permanentlyDeleteTrashItem, restoreTrashItem } from './trash'
import type { Env, SessionInfo } from './types'

const pathQuerySchema = z.object({ path: z.string().trim().min(1, '\u7f3a\u5c11 path \u53c2\u6570') })
const listQuerySchema = z.object({ prefix: z.string().optional() })
const importTaskQuerySchema = z.object({ limit: z.string().optional() })
const trashQuerySchema = z.object({ limit: z.string().optional() })
const fileQuerySchema = z.object({ path: z.string().trim().min(1, '\u7f3a\u5c11 path \u53c2\u6570'), download: z.string().optional() })
const folderSchema = z.object({ path: z.string().trim().min(1, '\u7f3a\u5c11 path \u53c2\u6570') })
const moveSchema = z.object({
  kind: z.enum(['file', 'folder']),
  path: z.string().trim().min(1, '\u7f3a\u5c11\u79fb\u52a8\u53c2\u6570'),
  targetPath: z.string().trim().min(1, '\u7f3a\u5c11\u79fb\u52a8\u53c2\u6570')
})
const trashActionSchema = z.object({ itemId: z.string().trim().min(1, '\u7f3a\u5c11\u56de\u6536\u7ad9\u6761\u76ee ID') })
const shareCreateSchema = z.object({
  kind: z.enum(['file', 'folder']),
  path: z.string().trim().min(1, '\u5206\u4eab\u53c2\u6570\u4e0d\u5b8c\u6574'),
  expiresInDays: z.union([z.number(), z.string()]).optional().nullable()
})
const shareDeleteSchema = z.object({ code: z.string().trim().min(1, '\u7f3a\u5c11\u5206\u4eab\u7801') })
const sharesQuerySchema = z.object({
  kind: z.enum(['file', 'folder']),
  path: z.string().trim().min(1, '\u7f3a\u5c11 path \u53c2\u6570')
})

type ApiEnv = {
  Bindings: Env
  Variables: {
    session: SessionInfo
  }
}

const api = new Hono<ApiEnv>()

api.onError((error) => respondError(error))

api.use('*', async (c, next) => {
  const session = await requireAdmin(c.req.raw, c.env)
  c.set('session', session)
  await next()
})

api.get('/session', (c) => c.json(c.get('session')))

api.get('/list', zValidator('query', listQuerySchema), async (c) => {
  const query = c.req.valid('query')
  return c.json(await listDirectory(c.env, normalizeDirectoryPath(query.prefix || '')))
})

api.get('/trash', zValidator('query', trashQuerySchema), async (c) => {
  const query = c.req.valid('query')
  const limit = query.limit ? Number.parseInt(query.limit, 10) : null
  return c.json({ items: await listTrashItems(c.env, Number.isFinite(limit) ? limit : null) })
})

api.post('/trash/restore', zValidator('json', trashActionSchema), async (c) => {
  const session = c.get('session')
  const payload = c.req.valid('json')
  return c.json(await restoreTrashItem(c.env, payload.itemId))
})

api.delete('/trash', zValidator('query', trashActionSchema), async (c) => {
  const query = c.req.valid('query')
  return c.json(await permanentlyDeleteTrashItem(c.env, query.itemId))
})

api.get('/import-tasks', zValidator('query', importTaskQuerySchema), async (c) => {
  const query = c.req.valid('query')
  return c.json({ tasks: await listImportTasks(c.env, query.limit || null) })
})

api.get('/object', zValidator('query', pathQuerySchema), async (c) => {
  const query = c.req.valid('query')
  return c.json(await getObjectDetail(c.env, normalizeAnyPath(query.path)))
})

api.delete('/object', zValidator('query', pathQuerySchema), async (c) => {
  const session = c.get('session')
  const query = c.req.valid('query')
  const targetPath = normalizeAnyPath(query.path)
  const result = await moveToTrash(c.env, targetPath, session.email)
  const revokedShares = await revokeSharesForPath(c.env, targetPath, targetPath.endsWith('/'))
  return c.json({ ...result, revokedShares })
})

api.get('/file', zValidator('query', fileQuerySchema), async (c) => {
  const query = c.req.valid('query')
  return await streamObject(c.env, normalizeFilePath(query.path), query.download === '1', c.req.raw)
})

api.post('/upload', async (c) => {
  const formData = await c.req.formData()
  const basePath = normalizeDirectoryPath(String(formData.get('basePath') || ''))
  return c.json(await handleUpload(formData, c.env, basePath), 201)
})

api.post('/folder', zValidator('json', folderSchema), async (c) => {
  const payload = c.req.valid('json')
  return c.json(await createFolder(c.env, normalizeDirectoryPath(payload.path)), 201)
})

api.post('/move', zValidator('json', moveSchema), async (c) => {
  const payload = c.req.valid('json')
  const sourcePath = payload.kind === 'folder' ? normalizeDirectoryPath(payload.path) : normalizeFilePath(payload.path)
  const targetPath = payload.kind === 'folder' ? normalizeDirectoryPath(payload.targetPath) : normalizeFilePath(payload.targetPath)
  const result = await moveObject(c.env, sourcePath, targetPath)
  const updatedShares = await retargetSharesForMove(c.env, sourcePath, targetPath, payload.kind === 'folder')
  return c.json({ ...result, updatedShares })
})

api.post('/import-url', async (c) => {
  const session = c.get('session')
  const payload = await c.req.json()
  return c.json(await createImportTask(c.env, session.email, payload), 202)
})

api.post('/share', zValidator('json', shareCreateSchema), async (c) => {
  const payload = c.req.valid('json')
  const session = c.get('session')
  const requestUrl = new URL(c.req.url)
  const normalizedPath = payload.kind === 'folder' ? normalizeDirectoryPath(payload.path) : normalizeFilePath(payload.path)
  const expiresInDays = parseOptionalNonNegativeNumber(payload.expiresInDays)
  return c.json(await createShare(c.env, session.email, payload.kind, normalizedPath, expiresInDays, requestUrl.origin), 201)
})

api.delete('/share', zValidator('query', shareDeleteSchema), async (c) => {
  const query = c.req.valid('query')
  const revoked = await revokeShare(c.env, query.code)
  if (!revoked) throw new HttpError(404, '\u5206\u4eab\u4e0d\u5b58\u5728\u6216\u5df2\u5931\u6548')
  return c.json({ revoked: true, code: query.code })
})

api.get('/shares', zValidator('query', sharesQuerySchema), async (c) => {
  const query = c.req.valid('query')
  const requestUrl = new URL(c.req.url)
  const normalizedPath = query.kind === 'folder' ? normalizeDirectoryPath(query.path) : normalizeFilePath(query.path)
  return c.json({ shares: await listSharesByTarget(c.env, query.kind, normalizedPath, requestUrl.origin) })
})

export default api
