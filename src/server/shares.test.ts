import { describe, expect, it } from 'vitest'
import { computeRetargetedSharePath, isExpiredShare } from './shares.ts'
import type { ShareRecord } from './types.ts'

function record(overrides: Partial<ShareRecord> = {}): ShareRecord {
  return {
    kind: 'file',
    path: 'docs/a.txt',
    createdAt: '2026-01-01T00:00:00.000Z',
    expiresAt: null,
    ...overrides
  }
}

describe('isExpiredShare', () => {
  const now = Date.parse('2026-07-26T12:00:00.000Z')

  it('没有过期时间就是永久有效', () => {
    expect(isExpiredShare(record({ expiresAt: null }), now)).toBe(false)
  })

  it('过期时间在将来时未过期', () => {
    expect(isExpiredShare(record({ expiresAt: '2026-07-27T00:00:00.000Z' }), now)).toBe(false)
  })

  it('过期时间在过去时已过期', () => {
    expect(isExpiredShare(record({ expiresAt: '2026-07-25T00:00:00.000Z' }), now)).toBe(true)
  })

  it('刚好到点算过期', () => {
    expect(isExpiredShare(record({ expiresAt: '2026-07-26T12:00:00.000Z' }), now)).toBe(true)
  })

  it('时间字段损坏时按未过期处理，避免误删用户的分享', () => {
    expect(isExpiredShare(record({ expiresAt: 'not-a-date' }), now)).toBe(false)
  })
})

describe('computeRetargetedSharePath 单文件移动', () => {
  it('路径完全相同时改写为新路径', () => {
    expect(computeRetargetedSharePath('docs/a.txt', 'docs/a.txt', 'docs/b.txt', false)).toBe('docs/b.txt')
  })

  it('路径不相同时不动', () => {
    expect(computeRetargetedSharePath('docs/other.txt', 'docs/a.txt', 'docs/b.txt', false)).toBeNull()
  })

  it('非递归模式下不会顺带改写前缀相同的其它文件', () => {
    // 'docs/a.txt.bak' 以 'docs/a.txt' 开头，但它是另一个文件
    expect(computeRetargetedSharePath('docs/a.txt.bak', 'docs/a.txt', 'docs/b.txt', false)).toBeNull()
  })
})

describe('computeRetargetedSharePath 文件夹移动', () => {
  it('文件夹自身的分享跟着改', () => {
    expect(computeRetargetedSharePath('old/', 'old/', 'new/', true)).toBe('new/')
  })

  it('子孙文件的分享跟着改，保留相对层级', () => {
    expect(computeRetargetedSharePath('old/a/b.txt', 'old/', 'new/', true)).toBe('new/a/b.txt')
  })

  it('子目录的分享跟着改', () => {
    expect(computeRetargetedSharePath('old/sub/', 'old/', 'new/', true)).toBe('new/sub/')
  })

  it('不在被移动目录下的分享不动', () => {
    expect(computeRetargetedSharePath('other/a.txt', 'old/', 'new/', true)).toBeNull()
  })

  it('同名前缀的兄弟目录不受影响', () => {
    // 'oldstuff/' 以 'old' 开头，但不在 'old/' 之下；源路径带结尾斜杠正是为了挡住这种误伤
    expect(computeRetargetedSharePath('oldstuff/a.txt', 'old/', 'new/', true)).toBeNull()
  })

  it('移动到更深的目标路径时层级仍然正确', () => {
    expect(computeRetargetedSharePath('old/a/b.txt', 'old/', 'archive/2026/old/', true)).toBe('archive/2026/old/a/b.txt')
  })
})
