import { desc, eq } from 'drizzle-orm'
import { getDb } from '../../db/client.ts'
import { importTasks, type ImportTaskRow } from '../../db/schema.ts'
import type { Env } from '../types.ts'

export type ImportTaskPatch = Partial<typeof importTasks.$inferInsert>

export async function insertImportTask(env: Env, values: typeof importTasks.$inferInsert) {
  const db = getDb(env)
  await db.insert(importTasks).values(values)
}

export async function deleteImportTask(env: Env, taskId: string) {
  const db = getDb(env)
  await db.delete(importTasks).where(eq(importTasks.id, taskId))
}

export async function listImportTaskRows(env: Env, limit: number): Promise<ImportTaskRow[]> {
  const db = getDb(env)
  return await db.select().from(importTasks).orderBy(desc(importTasks.createdAt)).limit(limit)
}

export async function findImportTaskRow(env: Env, taskId: string): Promise<ImportTaskRow | null> {
  const db = getDb(env)
  const rows = await db.select().from(importTasks).where(eq(importTasks.id, taskId)).limit(1)
  return rows[0] ?? null
}

export async function updateImportTask(env: Env, taskId: string, patch: ImportTaskPatch) {
  const db = getDb(env)
  await db.update(importTasks).set(patch).where(eq(importTasks.id, taskId))
}
