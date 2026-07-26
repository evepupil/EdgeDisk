-- 文件索引：R2 对象的可查询镜像，用于全盘搜索和存储用量统计。
-- 只索引文件，不索引文件夹——文件夹是隐式前缀，索引它需要从文件路径推导所有父级，
-- 孤儿清理成本高。搜文件夹留作后续扩展。
CREATE TABLE IF NOT EXISTS file_index (
  path TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  -- 小写副本，用于大小写不敏感的 LIKE 查询（SQLite 的 LIKE 对非 ASCII 不做大小写折叠）
  name_lower TEXT NOT NULL,
  directory TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  content_type TEXT,
  uploaded TEXT,
  indexed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_file_index_name_lower ON file_index (name_lower);
CREATE INDEX IF NOT EXISTS idx_file_index_directory ON file_index (directory);
CREATE INDEX IF NOT EXISTS idx_file_index_uploaded ON file_index (uploaded DESC);
