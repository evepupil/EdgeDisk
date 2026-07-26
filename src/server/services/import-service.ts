import { z } from 'zod'
import { HttpError } from '../errors.ts'
import { importFromUrl, type ImportInput, RetryableImportError } from '../imports.ts'
import { normalizeDirectoryPath, toPositiveInteger } from '../path.ts'
import {
  deleteImportTask,
  deleteImportTasksByStatus,
  findImportTaskRow,
  insertImportTask,
  listImportTaskRows,
  updateImportTask
} from '../repos/import-task-repo.ts'
import type { Env, ImportQueueMessage, ImportTask, ImportTaskStatus } from '../types.ts'
import {
  FINISHED_STATUSES,
  canCancelImportTask,
  canRetryImportTask,
  shouldSkipImportMessage
} from './import-task-status.ts'

const MAX_QUEUE_ATTEMPTS = 5
const DEFAULT_TASK_LIST_LIMIT = 12
const MAX_TASK_LIST_LIMIT = 50

const createImportTaskSchema = z.object({
  url: z
    .string({ error: '缺少下载 URL' })
    .trim()
    .min(1, '缺少下载 URL')
    .url('URL 不合法')
    .refine((value) => {
      const protocol = new URL(value).protocol
      return protocol === 'http:' || protocol === 'https:'
    }, '只支持 http / https 链接'),
  directory: z.string().optional().default(''),
  fileName: z.string().optional(),
  overwrite: z.union([z.boolean(), z.literal('true'), z.literal('false')]).optional().default(false)
})

const importQueueMessageSchema = z.object({
  taskId: z.string().trim().min(1, '任务 ID 不合法')
})

export async function createImportTask(env: Env, requestedBy: string, payload: unknown) {
  const input = parseCreateImportTask(payload)
  const queue = requireImportQueue(env)
  const now = new Date().toISOString()
  const id = crypto.randomUUID()

  await insertImportTask(env, {
    id,
    status: 'queued',
    sourceUrl: input.sourceUrl,
    directory: input.directory,
    requestedFileName: input.fileName ?? null,
    resolvedFileName: null,
    targetPath: null,
    overwrite: input.overwrite ? 1 : 0,
    requestedBy,
    attempts: 0,
    error: null,
    contentLength: null,
    contentType: null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null
  })

  try {
    await queue.send({ taskId: id })
  } catch (error) {
    await deleteImportTask(env, id)
    throw new HttpError(500, error instanceof Error ? `导入任务入队失败：${error.message}` : '导入任务入队失败')
  }

  const task = await getImportTaskById(env, id)
  if (!task) throw new HttpError(500, '导入任务创建成功但读取失败')
  return task
}

export async function listImportTasks(env: Env, rawLimit: string | null) {
  const limit = Math.min(toPositiveInteger(rawLimit || undefined, DEFAULT_TASK_LIST_LIMIT), MAX_TASK_LIST_LIMIT)
  const rows = await listImportTaskRows(env, limit)
  return rows.map(serializeImportTask)
}

export async function getImportTaskById(env: Env, taskId: string) {
  const row = await findImportTaskRow(env, taskId)
  return row ? serializeImportTask(row) : null
}

async function requireImportTask(env: Env, taskId: string): Promise<ImportTask> {
  const task = await getImportTaskById(env, taskId)
  if (!task) throw new HttpError(404, '导入任务不存在')
  return task
}

/**
 * 取消导入任务。
 *
 * 排队中的任务取消是干净的：消费者拿到消息时会看到 `canceled` 并直接跳过。
 * 已经在跑的任务只能「尽力取消」——正在飞的 fetch 无法中断，所以下载完成后
 * 消费者会回查状态，发现已取消就把刚写进 R2 的文件删掉。
 */
export async function cancelImportTask(env: Env, taskId: string) {
  const task = await requireImportTask(env, taskId)
  if (!canCancelImportTask(task.status)) {
    throw new HttpError(409, `当前状态（${task.status}）无法取消`)
  }

  const now = new Date().toISOString()
  await updateImportTask(env, task.id, {
    status: 'canceled',
    error: null,
    updatedAt: now,
    finishedAt: now
  })
  return { canceled: true, id: task.id, wasRunning: task.status === 'running' }
}

export async function retryImportTask(env: Env, taskId: string) {
  const task = await requireImportTask(env, taskId)
  if (!canRetryImportTask(task.status)) {
    throw new HttpError(409, `当前状态（${task.status}）无法重试`)
  }

  const queue = requireImportQueue(env)
  const now = new Date().toISOString()
  await updateImportTask(env, task.id, {
    status: 'queued',
    attempts: 0,
    error: null,
    updatedAt: now,
    startedAt: null,
    finishedAt: null
  })

  try {
    await queue.send({ taskId: task.id })
  } catch (error) {
    // 入队失败就把状态还原成失败，否则任务会永远停在「排队中」等一条不存在的消息。
    const failedAt = new Date().toISOString()
    await updateImportTask(env, task.id, {
      status: 'failed',
      error: error instanceof Error ? `重新入队失败：${error.message}` : '重新入队失败',
      updatedAt: failedAt,
      finishedAt: failedAt
    })
    throw new HttpError(500, '导入任务重新入队失败')
  }

  return await requireImportTask(env, task.id)
}

export async function clearFinishedImportTasks(env: Env) {
  const cleared = await deleteImportTasksByStatus(env, FINISHED_STATUSES)
  return { cleared }
}

export async function consumeImportQueue(batch: MessageBatch<ImportQueueMessage>, env: Env) {
  if (!env.IMPORTS_DB) {
    console.error('IMPORTS_DB binding missing, retrying batch')
    batch.retryAll({ delaySeconds: 30 })
    return
  }

  for (const message of batch.messages) {
    await consumeImportMessage(message, env)
  }
}

async function consumeImportMessage(message: Message<ImportQueueMessage>, env: Env) {
  const parsedMessage = importQueueMessageSchema.safeParse(message.body)
  if (!parsedMessage.success) {
    console.error('Invalid import queue message', parsedMessage.error.flatten())
    message.ack()
    return
  }

  const task = await getImportTaskById(env, parsedMessage.data.taskId)
  if (!task || shouldSkipImportMessage(task.status)) {
    message.ack()
    return
  }

  const startedAt = new Date().toISOString()
  await updateImportTask(env, task.id, {
    status: 'running',
    attempts: message.attempts,
    updatedAt: startedAt,
    startedAt,
    finishedAt: null
  })

  try {
    const result = await importFromUrl(env, {
      sourceUrl: task.sourceUrl,
      directory: task.directory,
      fileName: task.requestedFileName || undefined,
      overwrite: task.overwrite
    })

    // 下载期间可能被取消。无法中断已经开始的 fetch，只能事后把落地的文件清掉。
    const latest = await getImportTaskById(env, task.id)
    if (latest?.status === 'canceled') {
      await env.DISK.delete(result.path)
      message.ack()
      return
    }

    const now = new Date().toISOString()
    await updateImportTask(env, task.id, {
      status: 'succeeded',
      attempts: message.attempts,
      resolvedFileName: result.fileName,
      targetPath: result.path,
      contentLength: result.size,
      contentType: result.contentType,
      error: null,
      updatedAt: now,
      finishedAt: now
    })
    message.ack()
  } catch (error) {
    const errorMessage = truncateErrorMessage(error)

    // 下载失败的同时可能已经被取消，别把 canceled 覆盖成 failed 或重新入队。
    const latest = await getImportTaskById(env, task.id)
    if (latest?.status === 'canceled') {
      message.ack()
      return
    }

    if (shouldRetryImport(error, message.attempts)) {
      await updateImportTask(env, task.id, {
        status: 'queued',
        attempts: message.attempts,
        error: errorMessage,
        updatedAt: new Date().toISOString(),
        finishedAt: null
      })
      message.retry({ delaySeconds: getRetryDelaySeconds(message.attempts) })
      return
    }

    const now = new Date().toISOString()
    await updateImportTask(env, task.id, {
      status: 'failed',
      attempts: message.attempts,
      error: errorMessage,
      updatedAt: now,
      finishedAt: now
    })
    message.ack()
  }
}

function parseCreateImportTask(payload: unknown): ImportInput {
  const parsed = createImportTaskSchema.safeParse(payload)
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message || '导入参数不合法')
  }

  const overwrite = parsed.data.overwrite === true || parsed.data.overwrite === 'true'
  const fileName = parsed.data.fileName?.trim() || undefined
  return {
    sourceUrl: parsed.data.url,
    directory: normalizeDirectoryPath(parsed.data.directory),
    fileName,
    overwrite
  }
}

function requireImportQueue(env: Env): Queue<ImportQueueMessage> {
  if (!env.IMPORT_QUEUE) throw new HttpError(500, '请先绑定 Queues 生产者 IMPORT_QUEUE')
  return env.IMPORT_QUEUE
}

function shouldRetryImport(error: unknown, attempts: number): boolean {
  if (attempts >= MAX_QUEUE_ATTEMPTS) return false
  if (error instanceof RetryableImportError) return true
  if (error instanceof HttpError) return error.status >= 500
  return true
}

function getRetryDelaySeconds(attempts: number): number {
  return Math.min(30 * Math.max(1, attempts), 300)
}

function truncateErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'URL 导入失败'
  return message.slice(0, 500)
}

function serializeImportTask(row: any): ImportTask {
  return {
    id: row.id,
    status: row.status as ImportTaskStatus,
    sourceUrl: row.sourceUrl,
    directory: row.directory,
    requestedFileName: row.requestedFileName,
    resolvedFileName: row.resolvedFileName,
    targetPath: row.targetPath,
    overwrite: Boolean(row.overwrite),
    requestedBy: row.requestedBy,
    attempts: row.attempts,
    error: row.error,
    contentLength: row.contentLength,
    contentType: row.contentType,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt
  }
}
