export interface Env {
  APP_NAME?: string;
  ACCESS_AUD?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ADMIN_EMAIL?: string;
  MAX_LIST_KEYS?: string;
  IMPORT_MAX_BYTES?: string;
  DISABLE_ACCESS_AUTH?: string;
  IMPORTS_DB?: D1Database;
  IMPORT_QUEUE?: Queue<ImportQueueMessage>;
  DISK: R2Bucket;
  SHARES: KVNamespace;
}

export type SessionInfo = { email: string };
export type ShareKind = "file" | "folder";
export type ImportTaskStatus = "queued" | "running" | "succeeded" | "failed";
export type ImportQueueMessage = { taskId: string };

export type ShareRecord = {
  kind: ShareKind;
  path: string;
  createdAt: string;
  expiresAt: string | null;
  createdBy?: string;
};

export type ListedFile = {
  kind: "file";
  name: string;
  path: string;
  size: number;
  uploaded: string | null;
  etag: string | null;
  contentType: string | null;
  subpath?: string;
};

export type ListedFolder = {
  kind: "folder";
  name: string;
  path: string;
  subpath?: string;
};

export type ImportTask = {
  id: string;
  status: ImportTaskStatus;
  sourceUrl: string;
  directory: string;
  requestedFileName: string | null;
  resolvedFileName: string | null;
  targetPath: string | null;
  overwrite: boolean;
  requestedBy: string;
  attempts: number;
  error: string | null;
  contentLength: number | null;
  contentType: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};