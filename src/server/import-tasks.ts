import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client.ts";
import { importTasks, type ImportTaskRow } from "../db/schema.ts";
import { HttpError } from "./errors.ts";
import { importFromUrl, type ImportInput, RetryableImportError } from "./imports.ts";
import { normalizeDirectoryPath, toPositiveInteger } from "./path.ts";
import type { Env, ImportQueueMessage, ImportTask, ImportTaskStatus } from "./types.ts";

const MAX_QUEUE_ATTEMPTS = 5;
const DEFAULT_TASK_LIST_LIMIT = 12;
const MAX_TASK_LIST_LIMIT = 50;

const createImportTaskSchema = z.object({
  url: z
    .string({ error: "缺少下载 URL" })
    .trim()
    .min(1, "缺少下载 URL")
    .url("URL 不合法")
    .refine((value) => {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    }, "只支持 http / https 链接"),
  directory: z.string().optional().default(""),
  fileName: z.string().optional(),
  overwrite: z.union([z.boolean(), z.literal("true"), z.literal("false")]).optional().default(false)
});

const importQueueMessageSchema = z.object({
  taskId: z.string().trim().min(1, "任务 ID 不合法")
});

export async function createImportTask(env: Env, requestedBy: string, payload: unknown) {
  const input = parseCreateImportTask(payload);
  const db = getDb(env);
  const queue = requireImportQueue(env);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db.insert(importTasks).values({
    id,
    status: "queued",
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
  });

  try {
    await queue.send({ taskId: id });
  } catch (error) {
    await db.delete(importTasks).where(eq(importTasks.id, id));
    throw new HttpError(500, error instanceof Error ? `导入任务入队失败：${error.message}` : "导入任务入队失败");
  }

  const task = await getImportTaskById(env, id);
  if (!task) throw new HttpError(500, "导入任务创建成功但读取失败");
  return task;
}

export async function listImportTasks(env: Env, rawLimit: string | null) {
  const db = getDb(env);
  const limit = Math.min(toPositiveInteger(rawLimit || undefined, DEFAULT_TASK_LIST_LIMIT), MAX_TASK_LIST_LIMIT);
  const rows = await db.select().from(importTasks).orderBy(desc(importTasks.createdAt)).limit(limit);
  return rows.map(serializeImportTask);
}

export async function getImportTaskById(env: Env, taskId: string) {
  const db = getDb(env);
  const rows = await db.select().from(importTasks).where(eq(importTasks.id, taskId)).limit(1);
  const row = rows[0];
  return row ? serializeImportTask(row) : null;
}

export async function consumeImportQueue(batch: MessageBatch<ImportQueueMessage>, env: Env) {
  if (!env.IMPORTS_DB) {
    console.error("IMPORTS_DB binding missing, retrying batch");
    batch.retryAll({ delaySeconds: 30 });
    return;
  }

  for (const message of batch.messages) {
    await consumeImportMessage(message, env);
  }
}

async function consumeImportMessage(message: Message<ImportQueueMessage>, env: Env) {
  const parsedMessage = importQueueMessageSchema.safeParse(message.body);
  if (!parsedMessage.success) {
    console.error("Invalid import queue message", parsedMessage.error.flatten());
    message.ack();
    return;
  }

  const task = await getImportTaskById(env, parsedMessage.data.taskId);
  if (!task) {
    message.ack();
    return;
  }
  if (task.status === "succeeded") {
    message.ack();
    return;
  }

  await markImportTaskRunning(env, task.id, message.attempts);

  try {
    const result = await importFromUrl(env, {
      sourceUrl: task.sourceUrl,
      directory: task.directory,
      fileName: task.requestedFileName || undefined,
      overwrite: task.overwrite
    });
    await markImportTaskSucceeded(env, task.id, message.attempts, result);
    message.ack();
  } catch (error) {
    const errorMessage = truncateErrorMessage(error);
    if (shouldRetryImport(error, message.attempts)) {
      await markImportTaskQueued(env, task.id, message.attempts, errorMessage);
      message.retry({ delaySeconds: getRetryDelaySeconds(message.attempts) });
      return;
    }
    await markImportTaskFailed(env, task.id, message.attempts, errorMessage);
    message.ack();
  }
}

function parseCreateImportTask(payload: unknown): ImportInput {
  const parsed = createImportTaskSchema.safeParse(payload);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message || "导入参数不合法");
  }

  const overwrite = parsed.data.overwrite === true || parsed.data.overwrite === "true";
  const fileName = parsed.data.fileName?.trim() || undefined;
  return {
    sourceUrl: parsed.data.url,
    directory: normalizeDirectoryPath(parsed.data.directory),
    fileName,
    overwrite
  };
}

function requireImportQueue(env: Env): Queue<ImportQueueMessage> {
  if (!env.IMPORT_QUEUE) throw new HttpError(500, "请先绑定 Queues 生产者 IMPORT_QUEUE");
  return env.IMPORT_QUEUE;
}

async function markImportTaskRunning(env: Env, taskId: string, attempts: number) {
  const db = getDb(env);
  const now = new Date().toISOString();
  await db
    .update(importTasks)
    .set({
      status: "running",
      attempts,
      updatedAt: now,
      startedAt: now,
      finishedAt: null
    })
    .where(eq(importTasks.id, taskId));
}

async function markImportTaskQueued(env: Env, taskId: string, attempts: number, errorMessage: string) {
  const db = getDb(env);
  await db
    .update(importTasks)
    .set({
      status: "queued",
      attempts,
      error: errorMessage,
      updatedAt: new Date().toISOString(),
      finishedAt: null
    })
    .where(eq(importTasks.id, taskId));
}

async function markImportTaskSucceeded(
  env: Env,
  taskId: string,
  attempts: number,
  result: Awaited<ReturnType<typeof importFromUrl>>
) {
  const db = getDb(env);
  const now = new Date().toISOString();
  await db
    .update(importTasks)
    .set({
      status: "succeeded",
      attempts,
      resolvedFileName: result.fileName,
      targetPath: result.path,
      contentLength: result.size,
      contentType: result.contentType,
      error: null,
      updatedAt: now,
      finishedAt: now
    })
    .where(eq(importTasks.id, taskId));
}

async function markImportTaskFailed(env: Env, taskId: string, attempts: number, errorMessage: string) {
  const db = getDb(env);
  const now = new Date().toISOString();
  await db
    .update(importTasks)
    .set({
      status: "failed",
      attempts,
      error: errorMessage,
      updatedAt: now,
      finishedAt: now
    })
    .where(eq(importTasks.id, taskId));
}

function shouldRetryImport(error: unknown, attempts: number): boolean {
  if (attempts >= MAX_QUEUE_ATTEMPTS) return false;
  if (error instanceof RetryableImportError) return true;
  if (error instanceof HttpError) return error.status >= 500;
  return true;
}

function getRetryDelaySeconds(attempts: number): number {
  return Math.min(30 * Math.max(1, attempts), 300);
}

function truncateErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "URL 导入失败";
  return message.slice(0, 500);
}

function serializeImportTask(row: ImportTaskRow): ImportTask {
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
  };
}