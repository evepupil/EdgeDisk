import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const importTasks = sqliteTable("import_tasks", {
  id: text("id").primaryKey(),
  status: text("status", { enum: ["queued", "running", "succeeded", "failed"] }).notNull(),
  sourceUrl: text("source_url").notNull(),
  directory: text("directory").notNull(),
  requestedFileName: text("requested_file_name"),
  resolvedFileName: text("resolved_file_name"),
  targetPath: text("target_path"),
  overwrite: integer("overwrite").notNull().default(0),
  requestedBy: text("requested_by").notNull(),
  attempts: integer("attempts").notNull().default(0),
  error: text("error"),
  contentLength: integer("content_length"),
  contentType: text("content_type"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  startedAt: text("started_at"),
  finishedAt: text("finished_at")
});

export type ImportTaskRow = typeof importTasks.$inferSelect;
export type NewImportTaskRow = typeof importTasks.$inferInsert;