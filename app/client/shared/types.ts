export type ItemKind = 'file' | 'folder'
export type MediaType = 'audio' | 'video' | null
export type ViewMode = 'table' | 'icon'
export type SortMode = 'name' | 'updated' | 'size'
export type Theme = 'light' | 'dark'

export type ListedFolder = {
  kind: 'folder'
  name: string
  path: string
  subpath?: string
}

export type ListedFile = {
  kind: 'file'
  name: string
  path: string
  size: number
  uploaded: string | null
  etag: string | null
  contentType: string | null
  subpath?: string
}

export type ListedItem = ListedFolder | ListedFile

export type DirectoryData = {
  prefix: string
  folders: ListedFolder[]
  files: ListedFile[]
}

export type ObjectDetail = {
  kind: ItemKind
  path: string
  name: string
  size: number | null
  uploaded: string | null
  contentType: string | null
  etag: string | null
  childCount?: number
  totalSize?: number
}

export type ImportTaskStatus = 'queued' | 'running' | 'succeeded' | 'failed'

export type ImportTask = {
  id: string
  status: ImportTaskStatus
  sourceUrl: string
  directory: string
  requestedFileName: string | null
  resolvedFileName: string | null
  targetPath: string | null
  overwrite: boolean
  requestedBy: string
  attempts: number
  error: string | null
  contentLength: number | null
  contentType: string | null
  createdAt: string
  updatedAt: string
  startedAt: string | null
  finishedAt: string | null
}

export type TrashItem = {
  id: string
  kind: ItemKind
  originalPath: string
  storagePrefix: string
  deletedBy: string
  deletedAt: string
  itemCount: number
  totalSize: number
  contentType: string | null
}

export type ShareTarget = Pick<ListedItem, 'kind' | 'path'>

export type ShareItem = {
  code: string
  url: string
  kind: ItemKind
  path: string
  createdAt: string
  expiresAt: string | null
  createdBy: string | null
}

export type ShareFileView = {
  kind: 'file'
  shareCode: string
  shareUrl: string
  rootPath: string
  currentPrefix: string
  createdAt: string
  expiresAt: string | null
  file: Omit<ListedFile, 'path' | 'kind'>
}

export type ShareFolderView = {
  kind: 'folder'
  shareCode: string
  shareUrl: string
  rootPath: string
  currentPrefix: string
  createdAt: string
  expiresAt: string | null
  folders: ListedFolder[]
  files: ListedFile[]
}

export type ShareView = ShareFileView | ShareFolderView
