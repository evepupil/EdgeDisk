import { describe, expect, it } from 'vitest'
import { FOLDER_MARKER, MAX_LIST_PAGE_SIZE, listDirectory, resolveListPageSize } from './objects.ts'
import { TRASH_PREFIX } from './storage.ts'
import type { Env } from './types.ts'

type FakeObject = {
  key: string
  size: number
  uploaded: Date
  etag: string
  httpEtag: string
  httpMetadata?: { contentType?: string }
}

type FakePage = {
  objects: FakeObject[]
  delimitedPrefixes: string[]
  truncated: boolean
  cursor?: string
}

function fakeObject(key: string, size = 10): FakeObject {
  return { key, size, uploaded: new Date('2026-01-01T00:00:00.000Z'), etag: `etag-${key}`, httpEtag: `"etag-${key}"` }
}

/**
 * 伪造的 R2 bucket：按下标返回预设页，游标约定为下一页的下标字符串。
 * 这里只验证我们自己的游标透传和过滤逻辑，不复刻 R2 的排序细节。
 */
function fakeEnv(pages: FakePage[], maxListKeys?: string) {
  const calls: R2ListOptions[] = []
  const env = {
    MAX_LIST_KEYS: maxListKeys,
    DISK: {
      list: (options: R2ListOptions) => {
        calls.push(options)
        const index = options.cursor ? Number(options.cursor) : 0
        return Promise.resolve(pages[index])
      }
    }
  } as unknown as Env
  return { env, calls }
}

describe('resolveListPageSize', () => {
  it('没有配置时用平台上限', () => {
    const { env } = fakeEnv([])
    expect(resolveListPageSize(env)).toBe(MAX_LIST_PAGE_SIZE)
  })

  it('采用 MAX_LIST_KEYS 配置的页大小', () => {
    const { env } = fakeEnv([], '250')
    expect(resolveListPageSize(env)).toBe(250)
  })

  it('调用方传入的页大小优先于环境配置', () => {
    const { env } = fakeEnv([], '250')
    expect(resolveListPageSize(env, 40)).toBe(40)
  })

  it('超过 1000 的请求被压回平台上限', () => {
    const { env } = fakeEnv([], '5000')
    expect(resolveListPageSize(env)).toBe(MAX_LIST_PAGE_SIZE)
    expect(resolveListPageSize(env, 99999)).toBe(MAX_LIST_PAGE_SIZE)
  })

  it('非法值回退到环境配置', () => {
    const { env } = fakeEnv([], '250')
    expect(resolveListPageSize(env, Number.NaN)).toBe(250)
    expect(resolveListPageSize(env, -5)).toBe(250)
    expect(resolveListPageSize(env, null)).toBe(250)
  })
})

describe('listDirectory', () => {
  it('列完时 cursor 为 null', async () => {
    const { env, calls } = fakeEnv([
      { objects: [fakeObject('docs/a.txt')], delimitedPrefixes: ['docs/sub/'], truncated: false }
    ])

    const page = await listDirectory(env, 'docs/')

    expect(page.truncated).toBe(false)
    expect(page.cursor).toBeNull()
    expect(page.files.map((file) => file.name)).toEqual(['a.txt'])
    expect(page.folders.map((folder) => folder.name)).toEqual(['sub'])
    expect(calls[0]).toMatchObject({ prefix: 'docs/', delimiter: '/' })
    expect(calls[0]?.cursor).toBeUndefined()
  })

  it('还有下一页时把 R2 游标透出去', async () => {
    const { env } = fakeEnv([
      { objects: [fakeObject('big/1.bin')], delimitedPrefixes: [], truncated: true, cursor: '1' }
    ])

    const page = await listDirectory(env, 'big/')

    expect(page.truncated).toBe(true)
    expect(page.cursor).toBe('1')
  })

  it('带游标调用时把游标传给 R2，并能读到后续页', async () => {
    const { env, calls } = fakeEnv([
      { objects: [fakeObject('big/1.bin')], delimitedPrefixes: [], truncated: true, cursor: '1' },
      { objects: [fakeObject('big/2.bin')], delimitedPrefixes: [], truncated: false }
    ])

    const page = await listDirectory(env, 'big/', { cursor: '1' })

    expect(calls[0]?.cursor).toBe('1')
    expect(page.files.map((file) => file.name)).toEqual(['2.bin'])
    expect(page.cursor).toBeNull()
  })

  it('过滤掉文件夹占位标记、目录自身和回收站前缀', async () => {
    const { env } = fakeEnv([
      {
        objects: [fakeObject('docs/'), fakeObject(`docs/${FOLDER_MARKER}`), fakeObject('docs/real.txt')],
        delimitedPrefixes: [TRASH_PREFIX, 'docs/sub/'],
        truncated: false
      }
    ])

    const page = await listDirectory(env, 'docs/')

    expect(page.files.map((file) => file.path)).toEqual(['docs/real.txt'])
    expect(page.folders.map((folder) => folder.path)).toEqual(['docs/sub/'])
  })

  it('把请求的页大小传给 R2', async () => {
    const { env, calls } = fakeEnv([{ objects: [], delimitedPrefixes: [], truncated: false }], '1000')

    await listDirectory(env, '', { limit: 25 })

    expect(calls[0]?.limit).toBe(25)
  })
})
