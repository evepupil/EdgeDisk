CREATE TABLE IF NOT EXISTS trash_items (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  original_path TEXT NOT NULL,
  storage_prefix TEXT NOT NULL,
  deleted_by TEXT NOT NULL,
  deleted_at TEXT NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  total_size INTEGER NOT NULL DEFAULT 0,
  content_type TEXT
);

CREATE INDEX IF NOT EXISTS idx_trash_items_deleted_at ON trash_items (deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_trash_items_original_path ON trash_items (original_path);
