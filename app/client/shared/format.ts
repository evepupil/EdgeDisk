import type { ListedItem, MediaType, SortMode } from './types'

const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'ogv', 'mov', 'mkv', 'avi'])
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'opus'])
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg'])
const SHEET_EXTENSIONS = new Set(['xls', 'xlsx', 'csv', 'ods'])
const ARCHIVE_EXTENSIONS = new Set(['zip', 'rar', '7z', 'tar', 'gz'])

export function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function formatBytes(size: number | null | undefined): string {
  if (size == null) return '-'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = Number(size)
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${value.toFixed(value >= 100 || index === 0 ? 0 : 1)} ${units[index]}`
}

export function formatTime(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-'
}

export function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

export function normalizeInputPath(value: string): string {
  return value.trim().replaceAll('\\', '/').replace(/^\/+|\/+$/g, '')
}

export function ensureFolderPath(value: string): string {
  const normalized = normalizeInputPath(value)
  return normalized ? `${normalized}/` : ''
}

export function parentDirectory(path: string): string {
  const plain = trimTrailingSlash(path)
  const separator = plain.lastIndexOf('/')
  return separator < 0 ? '' : plain.slice(0, separator + 1)
}

export function baseName(path: string): string {
  const parts = trimTrailingSlash(path).split('/').filter(Boolean)
  return parts.at(-1) || '/'
}

export function getMediaType(name: string): MediaType {
  const extension = extensionOf(name)
  if (VIDEO_EXTENSIONS.has(extension)) return 'video'
  if (AUDIO_EXTENSIONS.has(extension)) return 'audio'
  return null
}

export function getItemIcon(item: Pick<ListedItem, 'kind' | 'name'>): string {
  if (item.kind === 'folder') return 'folder'
  const extension = extensionOf(item.name)
  if (VIDEO_EXTENSIONS.has(extension)) return 'file-video'
  if (AUDIO_EXTENSIONS.has(extension)) return 'file-audio'
  if (IMAGE_EXTENSIONS.has(extension)) return 'file-image'
  if (SHEET_EXTENSIONS.has(extension)) return 'sheet'
  if (ARCHIVE_EXTENSIONS.has(extension)) return 'file-archive'
  if (extension === 'pdf' || ['txt', 'md', 'doc', 'docx'].includes(extension)) return 'file-text'
  return 'file'
}

export function filterAndSortItems(items: ListedItem[], query: string, sort: SortMode): ListedItem[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN')
  const filtered = normalizedQuery
    ? items.filter((item) => item.name.toLocaleLowerCase('zh-CN').includes(normalizedQuery))
    : [...items]

  return filtered.sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === 'folder' ? -1 : 1
    if (sort === 'size') return itemSize(left) - itemSize(right) || compareNames(left, right)
    if (sort === 'updated') return itemTime(right) - itemTime(left) || compareNames(left, right)
    return compareNames(left, right)
  })
}

function extensionOf(name: string): string {
  const segments = name.toLocaleLowerCase().split('.')
  return segments.length > 1 ? segments.at(-1) || '' : ''
}

function itemSize(item: ListedItem): number {
  return item.kind === 'file' ? item.size : -1
}

function itemTime(item: ListedItem): number {
  if (item.kind === 'folder' || !item.uploaded) return 0
  return new Date(item.uploaded).getTime()
}

function compareNames(left: ListedItem, right: ListedItem): number {
  return left.name.localeCompare(right.name, 'zh-CN', { numeric: true, sensitivity: 'base' })
}
