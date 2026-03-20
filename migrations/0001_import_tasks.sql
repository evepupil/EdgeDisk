CREATE TABLE IF NOT EXISTS import_tasks (
  id TEXT PRIMARY KEY NOT NULL,
  status TEXT NOT NULL,
  source_url TEXT NOT NULL,
  directory TEXT NOT NULL,
  requested_file_name TEXT,
  resolved_file_name TEXT,
  target_path TEXT,
  overwrite INTEGER NOT NULL DEFAULT 0,
  requested_by TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  content_length INTEGER,
  content_type TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_import_tasks_created_at ON import_tasks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_tasks_status ON import_tasks (status, created_at DESC);