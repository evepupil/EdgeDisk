import { describe, expect, it, vi } from 'vitest'
import { MAX_AUTO_PAGES, collectPages } from './paging'

type Page = { cursor: string | null; items: string[] }

function pagesOf(...chunks: string[][]): Page[] {
  return chunks.map((items, index) => ({
    items,
    cursor: index < chunks.length - 1 ? String(index + 1) : null
  }))
}

function collect(pages: Page[], overrides: Partial<Parameters<typeof collectPages<Page>>[0]> = {}) {
  const fetchNext = vi.fn((cursor: string) => Promise.resolve(pages[Number(cursor)] as Page))
  const first = pages[0] as Page
  const promise = collectPages<Page>({
    first,
    fetchNext,
    merge: (accumulated, next) => ({ ...next, items: [...accumulated.items, ...next.items] }),
    ...overrides
  })
  return { promise, fetchNext }
}

describe('collectPages', () => {
  it('只有一页时不再发请求', async () => {
    const { promise, fetchNext } = collect(pagesOf(['a', 'b']))
    const result = await promise

    expect(fetchNext).not.toHaveBeenCalled()
    expect(result.pagesLoaded).toBe(1)
    expect(result.capped).toBe(false)
    expect(result.stale).toBe(false)
    expect(result.value.items).toEqual(['a', 'b'])
  })

  it('把后续页一路拉完并按顺序合并', async () => {
    const { promise, fetchNext } = collect(pagesOf(['a'], ['b'], ['c']))
    const result = await promise

    expect(fetchNext).toHaveBeenCalledTimes(2)
    expect(result.pagesLoaded).toBe(3)
    expect(result.capped).toBe(false)
    expect(result.value.items).toEqual(['a', 'b', 'c'])
    expect(result.value.cursor).toBeNull()
  })

  it('每拉到一页回调一次进度，首页不算', async () => {
    const onProgress = vi.fn()
    const { promise } = collect(pagesOf(['a'], ['b'], ['c']), { onProgress })
    await promise

    expect(onProgress).toHaveBeenCalledTimes(2)
    expect(onProgress.mock.calls[1]?.[1]).toBe(3)
  })

  it('触到页数上限时标记 capped 并停手', async () => {
    const { promise, fetchNext } = collect(pagesOf(['a'], ['b'], ['c'], ['d']), { maxPages: 2 })
    const result = await promise

    expect(fetchNext).toHaveBeenCalledTimes(1)
    expect(result.pagesLoaded).toBe(2)
    expect(result.capped).toBe(true)
    expect(result.value.items).toEqual(['a', 'b'])
  })

  it('调用方切走后立刻停手并标记 stale', async () => {
    let stale = false
    const pages = pagesOf(['a'], ['b'], ['c'])
    const fetchNext = vi.fn((cursor: string) => {
      stale = true
      return Promise.resolve(pages[Number(cursor)] as Page)
    })
    const result = await collectPages<Page>({
      first: pages[0] as Page,
      fetchNext,
      merge: (accumulated, next) => ({ ...next, items: [...accumulated.items, ...next.items] }),
      isStale: () => stale
    })

    expect(fetchNext).toHaveBeenCalledTimes(1)
    expect(result.stale).toBe(true)
    expect(result.capped).toBe(false)
    // 切走后的那一页不能混进结果里
    expect(result.value.items).toEqual(['a'])
  })

  it('切走发生在第一次请求之前就完全不发请求', async () => {
    const { promise, fetchNext } = collect(pagesOf(['a'], ['b']), { isStale: () => true })
    const result = await promise

    expect(fetchNext).not.toHaveBeenCalled()
    expect(result.stale).toBe(true)
  })

  it('非法的 maxPages 回退到默认上限', async () => {
    const { promise, fetchNext } = collect(pagesOf(['a'], ['b']), { maxPages: 0 })
    await promise

    expect(MAX_AUTO_PAGES).toBeGreaterThan(1)
    expect(fetchNext).toHaveBeenCalledTimes(1)
  })
})
