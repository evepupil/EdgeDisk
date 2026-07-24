import { describe, expect, it } from 'vitest'
import {
  baseName,
  ensureFolderPath,
  filterAndSortItems,
  formatBytes,
  getItemIcon,
  getMediaType,
  normalizeInputPath,
  parentDirectory,
} from './format'
import type { ListedItem } from './types'

const items: ListedItem[] = [
  { kind: 'file', name: '10-report.pdf', path: '10-report.pdf', size: 10, uploaded: '2026-07-20T00:00:00.000Z', etag: null, contentType: 'application/pdf' },
  { kind: 'folder', name: '资料', path: '资料/' },
  { kind: 'file', name: '2-report.pdf', path: '2-report.pdf', size: 20, uploaded: '2026-07-24T00:00:00.000Z', etag: null, contentType: 'application/pdf' },
]

describe('path helpers', () => {
  it('normalizes Windows separators and outer slashes', () => {
    expect(normalizeInputPath(' \\docs\\reports\\ ')).toBe('docs/reports')
    expect(ensureFolderPath('/docs/reports')).toBe('docs/reports/')
  })

  it('finds parent directories and base names', () => {
    expect(parentDirectory('docs/reports/file.pdf')).toBe('docs/reports/')
    expect(parentDirectory('file.pdf')).toBe('')
    expect(baseName('docs/reports/')).toBe('reports')
  })
})

describe('file presentation', () => {
  it('formats byte values at stable unit boundaries', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(null)).toBe('-')
  })

  it('detects media and representative file icons', () => {
    expect(getMediaType('demo.MP4')).toBe('video')
    expect(getMediaType('meeting.m4a')).toBe('audio')
    expect(getMediaType('report.pdf')).toBeNull()
    expect(getItemIcon({ kind: 'file', name: 'budget.xlsx' })).toBe('sheet')
    expect(getItemIcon({ kind: 'folder', name: 'docs' })).toBe('folder')
  })
})

describe('directory filtering and sorting', () => {
  it('keeps folders first and uses numeric name ordering', () => {
    expect(filterAndSortItems(items, '', 'name').map((item) => item.name)).toEqual(['资料', '2-report.pdf', '10-report.pdf'])
  })

  it('filters names without changing case sensitivity expectations', () => {
    expect(filterAndSortItems(items, 'REPORT', 'name').map((item) => item.name)).toEqual(['2-report.pdf', '10-report.pdf'])
  })

  it('sorts files by size and newest update after folders', () => {
    expect(filterAndSortItems(items, '', 'size').map((item) => item.name)).toEqual(['资料', '10-report.pdf', '2-report.pdf'])
    expect(filterAndSortItems(items, '', 'updated').map((item) => item.name)).toEqual(['资料', '2-report.pdf', '10-report.pdf'])
  })
})
