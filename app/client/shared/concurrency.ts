/**
 * 上传用到的两个通用调度工具：限并发跑任务、失败退避重试。
 * 都不碰 DOM，方便单测。
 */

/**
 * 按固定并发数跑完整个队列。
 *
 * 任何一个任务抛错都会立刻向外冒泡（`Promise.all` 语义），调用方需要自己决定
 * 是整批失败还是在 worker 内部把错误吞掉记账。
 */
export async function runWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  const safeLimit = Math.max(1, Math.trunc(limit))
  let cursor = 0

  const runners = Array.from({ length: Math.min(safeLimit, items.length) }, async () => {
    while (true) {
      const index = cursor
      if (index >= items.length) return
      cursor += 1
      await worker(items[index] as T, index)
    }
  })

  await Promise.all(runners)
}

export type RetryOptions = {
  /** 首次失败之后还能再试几次。0 表示不重试。 */
  retries: number
  /** 返回 true 时立刻放弃重试并把最后一个错误抛出。 */
  isAborted?: () => boolean
  /** 判断这个错误值不值得重试；默认全部重试。 */
  shouldRetry?: (error: unknown) => boolean
  delayMs?: (attempt: number) => number
  sleep?: (ms: number) => Promise<void>
  onRetry?: (error: unknown, attempt: number) => void
}

export function defaultBackoffMs(attempt: number): number {
  return Math.min(8000, 500 * 2 ** (attempt - 1))
}

/** `attempt` 从 1 开始计数，方便退避公式和日志阅读。 */
export async function withRetry<T>(run: (attempt: number) => Promise<T>, options: RetryOptions): Promise<T> {
  const retries = Math.max(0, Math.trunc(options.retries))
  const isAborted = options.isAborted ?? (() => false)
  const shouldRetry = options.shouldRetry ?? (() => true)
  const delayMs = options.delayMs ?? defaultBackoffMs
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms)))

  let attempt = 0
  while (true) {
    attempt += 1
    try {
      return await run(attempt)
    } catch (error) {
      if (attempt > retries || isAborted() || !shouldRetry(error)) throw error
      options.onRetry?.(error, attempt)
      await sleep(delayMs(attempt))
      if (isAborted()) throw error
    }
  }
}
