import { describe, expect, it } from 'vitest'
import { FOLDER_MARKER } from '../objects.ts'
import { TRASH_PREFIX } from '../storage.ts'
import { isIndexableKey } from './search-service.ts'

describe('isIndexableKey', () => {
  it('普通文件进索引', () => {
    expect(isIndexableKey('docs/report.pdf')).toBe(true)
    expect(isIndexableKey('root.txt')).toBe(true)
  })

  it('回收站里的对象不进索引', () => {
    // 已经被删掉的文件出现在搜索结果里，会让人以为它还在原处
    expect(isIndexableKey(`${TRASH_PREFIX}abc123/report.pdf`)).toBe(false)
  })

  it('文件夹占位标记不进索引', () => {
    expect(isIndexableKey(`docs/${FOLDER_MARKER}`)).toBe(false)
    expect(isIndexableKey(FOLDER_MARKER)).toBe(false)
  })

  it('目录形态的键不进索引', () => {
    expect(isIndexableKey('docs/')).toBe(false)
  })

  it('空键不进索引', () => {
    expect(isIndexableKey('')).toBe(false)
  })

  it('名字里含有标记片段的正常文件仍然进索引', () => {
    expect(isIndexableKey(`docs/my${FOLDER_MARKER}notes.txt`)).toBe(true)
  })

  it('只有真的在回收站目录下才排除，名字相似的普通目录不受影响', () => {
    // TRASH_PREFIX 带结尾斜杠，正是靠这个挡住同名前缀的误伤：
    // '__edgedisk_trashcan/' 是用户自己的目录，不该从搜索里消失
    expect(TRASH_PREFIX.endsWith('/')).toBe(true)
    expect(isIndexableKey('__edgedisk_trashcan/a.txt')).toBe(true)
    expect(isIndexableKey('my__edgedisk_trash/a.txt')).toBe(true)
    expect(isIndexableKey('__edgedisk_trash/id/a.txt')).toBe(false)
  })
})
