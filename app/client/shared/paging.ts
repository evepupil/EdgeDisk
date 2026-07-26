/**
 * 游标翻页的通用收集逻辑。
 *
 * R2 一次最多返回 1000 条，所以一个大目录会被切成多页。这里负责把后续页
 * 一路拉完再交回调用方，同时保证：
 * - 有页数上限，超大目录不会把浏览器拖死；
 * - 调用方切走以后（`isStale` 为真）立刻停手，旧目录的数据不会混进新目录。
 */

/** 一次浏览最多自动拉取的页数。按每页 1000 条算，上限约两万项。 */
export const MAX_AUTO_PAGES = 20

export type CursorPage = { cursor: string | null }

export type CollectPagesResult<T> = {
  value: T
  pagesLoaded: number
  /** 触到页数上限，后面还有内容没加载。 */
  capped: boolean
  /** 加载过程中调用方已经切走，结果应当整个丢弃。 */
  stale: boolean
}

export type CollectPagesOptions<T extends CursorPage> = {
  first: T
  fetchNext: (cursor: string) => Promise<T>
  merge: (accumulated: T, next: T) => T
  maxPages?: number
  isStale?: () => boolean
  onProgress?: (accumulated: T, pagesLoaded: number) => void
}

export async function collectPages<T extends CursorPage>(options: CollectPagesOptions<T>): Promise<CollectPagesResult<T>> {
  const maxPages = options.maxPages && options.maxPages > 0 ? options.maxPages : MAX_AUTO_PAGES
  const isStale = options.isStale ?? (() => false)
  let value = options.first
  let pagesLoaded = 1

  while (value.cursor && pagesLoaded < maxPages) {
    if (isStale()) return { value, pagesLoaded, capped: false, stale: true }
    const next = await options.fetchNext(value.cursor)
    if (isStale()) return { value, pagesLoaded, capped: false, stale: true }
    value = options.merge(value, next)
    pagesLoaded += 1
    options.onProgress?.(value, pagesLoaded)
  }

  return { value, pagesLoaded, capped: Boolean(value.cursor), stale: false }
}
