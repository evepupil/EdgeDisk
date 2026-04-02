import { desc, eq } from 'drizzle-orm'
import { getDb } from '../../db/client.ts'
import { trashItems, type TrashItemRow } from '../../db/schema.ts'
import type { Env } from '../types.ts'

export async function insertTrashItem(env: Env, values: typeof trashItems.$inferInsert) {
  const db = getDb(env)
  await db.insert(trashItems).values(values)
}

export async function listTrashItemRows(env: Env, limit: number): Promise<TrashItemRow[]> {
  const db = getDb(env)
  return await db.select().from(trashItems).orderBy(desc(trashItems.deletedAt)).limit(limit)
}

export async function findTrashItemRow(env: Env, itemId: string): Promise<TrashItemRow | null> {
  const db = getDb(env)
  const rows = await db.select().from(trashItems).where(eq(trashItems.id, itemId)).limit(1)
  return rows[0] ?? null
}

export async function deleteTrashItemRow(env: Env, itemId: string) {
  const db = getDb(env)
  await db.delete(trashItems).where(eq(trashItems.id, itemId))
}
