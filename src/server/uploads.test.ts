import { describe, expect, it } from 'vitest'
import { HttpError } from './errors.ts'
import { FOLDER_MARKER } from './objects.ts'
import { TRASH_PREFIX } from './storage.ts'
import type { Env } from './types.ts'
import {
  DEFAULT_PART_BYTES,
  MAX_PART_COUNT,
  MIN_PART_BYTES,
  assertDistinctParts,
  assertPartNumber,
  assertWritableFilePath,
  getUploadConfig,
  resolvePartSize,
  sortParts
} from './uploads.ts'

function env(uploadPartBytes?: string): Env {
  return { UPLOAD_PART_BYTES: uploadPartBytes } as unknown as Env
}

describe('resolvePartSize', () => {
  it('没有配置时用默认片大小', () => {
    expect(resolvePartSize(env())).toBe(DEFAULT_PART_BYTES)
  })

  it('采用配置的片大小', () => {
    const configured = 32 * 1024 * 1024
    expect(resolvePartSize(env(String(configured)))).toBe(configured)
  })

  it('低于 R2 最小片大小时抬到 5 MiB', () => {
    expect(resolvePartSize(env('1024'))).toBe(MIN_PART_BYTES)
    expect(resolvePartSize(env('0'))).toBe(DEFAULT_PART_BYTES)
  })
})

describe('getUploadConfig', () => {
  it('单文件上限等于片大小乘以最大片数', () => {
    const config = getUploadConfig(env())
    expect(config.partSize).toBe(DEFAULT_PART_BYTES)
    expect(config.maxPartCount).toBe(MAX_PART_COUNT)
    expect(config.maxFileBytes).toBe(DEFAULT_PART_BYTES * MAX_PART_COUNT)
  })
})

describe('assertWritableFilePath', () => {
  it('放过普通路径', () => {
    expect(assertWritableFilePath('docs/a.txt')).toBe('docs/a.txt')
  })

  it('挡住写入回收站前缀', () => {
    expect(() => assertWritableFilePath(`${TRASH_PREFIX}abc/a.txt`)).toThrow(HttpError)
  })

  it('挡住与文件夹占位标记同名的文件', () => {
    // 这种文件会被目录列表过滤掉，传上去等于人间蒸发
    expect(() => assertWritableFilePath(`docs/${FOLDER_MARKER}`)).toThrow(HttpError)
  })

  it('名字里只是包含标记片段的正常文件不受影响', () => {
    const path = `docs/my${FOLDER_MARKER}notes.txt`
    expect(assertWritableFilePath(path)).toBe(path)
  })
})

describe('assertPartNumber', () => {
  it('接受 1 到最大片数之间的整数', () => {
    expect(assertPartNumber(1)).toBe(1)
    expect(assertPartNumber(MAX_PART_COUNT)).toBe(MAX_PART_COUNT)
  })

  it('拒绝越界值和非整数', () => {
    expect(() => assertPartNumber(0)).toThrow(HttpError)
    expect(() => assertPartNumber(-1)).toThrow(HttpError)
    expect(() => assertPartNumber(MAX_PART_COUNT + 1)).toThrow(HttpError)
    expect(() => assertPartNumber(1.5)).toThrow(HttpError)
    expect(() => assertPartNumber(Number.NaN)).toThrow(HttpError)
  })
})

describe('sortParts', () => {
  it('按片号升序排列，因为并发上传回来的顺序不定', () => {
    const parts = [
      { partNumber: 3, etag: 'c' },
      { partNumber: 1, etag: 'a' },
      { partNumber: 2, etag: 'b' }
    ]
    expect(sortParts(parts).map((part) => part.partNumber)).toEqual([1, 2, 3])
  })

  it('不改动传入的数组', () => {
    const parts = [
      { partNumber: 2, etag: 'b' },
      { partNumber: 1, etag: 'a' }
    ]
    sortParts(parts)
    expect(parts.map((part) => part.partNumber)).toEqual([2, 1])
  })
})

describe('assertDistinctParts', () => {
  it('放过片号互不相同的列表', () => {
    const parts = [
      { partNumber: 1, etag: 'a' },
      { partNumber: 2, etag: 'b' }
    ]
    expect(assertDistinctParts(parts)).toBe(parts)
  })

  it('拒绝重复片号', () => {
    expect(() =>
      assertDistinctParts([
        { partNumber: 1, etag: 'a' },
        { partNumber: 1, etag: 'b' }
      ])
    ).toThrow(HttpError)
  })

  it('顺带校验片号本身合法', () => {
    expect(() => assertDistinctParts([{ partNumber: 0, etag: 'a' }])).toThrow(HttpError)
  })
})
