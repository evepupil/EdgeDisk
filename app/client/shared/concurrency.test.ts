import { describe, expect, it, vi } from 'vitest'
import { defaultBackoffMs, runWithConcurrency, withRetry } from './concurrency'

const noSleep = (): Promise<void> => Promise.resolve()

describe('runWithConcurrency', () => {
  it('每个任务恰好跑一次，索引正确', async () => {
    const seen: Array<[string, number]> = []
    await runWithConcurrency(['a', 'b', 'c'], 2, async (item, index) => {
      seen.push([item, index])
    })

    expect(seen).toHaveLength(3)
    expect(seen.sort((left, right) => left[1] - right[1])).toEqual([['a', 0], ['b', 1], ['c', 2]])
  })

  it('同时在跑的任务数不超过上限', async () => {
    let inFlight = 0
    let peak = 0
    await runWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async () => {
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await Promise.resolve()
      await Promise.resolve()
      inFlight -= 1
    })

    expect(peak).toBe(3)
  })

  it('并发数大于任务数时不会空转', async () => {
    const worker = vi.fn(async () => undefined)
    await runWithConcurrency(['only'], 8, worker)
    expect(worker).toHaveBeenCalledTimes(1)
  })

  it('空队列直接返回', async () => {
    const worker = vi.fn(async () => undefined)
    await runWithConcurrency([], 4, worker)
    expect(worker).not.toHaveBeenCalled()
  })

  it('并发数非法时退回 1', async () => {
    let peak = 0
    let inFlight = 0
    await runWithConcurrency([1, 2, 3], 0, async () => {
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await Promise.resolve()
      inFlight -= 1
    })
    expect(peak).toBe(1)
  })

  it('任务抛错时向外冒泡', async () => {
    await expect(
      runWithConcurrency([1, 2], 1, async (item) => {
        if (item === 2) throw new Error('boom')
      })
    ).rejects.toThrow('boom')
  })
})

describe('withRetry', () => {
  it('第一次就成功时不重试', async () => {
    const run = vi.fn(async () => 'ok')
    await expect(withRetry(run, { retries: 3, sleep: noSleep })).resolves.toBe('ok')
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('失败后重试直到成功，attempt 从 1 开始计数', async () => {
    const attempts: number[] = []
    const result = await withRetry(
      async (attempt) => {
        attempts.push(attempt)
        if (attempt < 3) throw new Error('flaky')
        return 'ok'
      },
      { retries: 3, sleep: noSleep }
    )

    expect(result).toBe('ok')
    expect(attempts).toEqual([1, 2, 3])
  })

  it('重试次数用尽后抛出最后一个错误', async () => {
    const run = vi.fn(async () => {
      throw new Error('always')
    })
    await expect(withRetry(run, { retries: 2, sleep: noSleep })).rejects.toThrow('always')
    // 首次 + 2 次重试
    expect(run).toHaveBeenCalledTimes(3)
  })

  it('retries 为 0 时只跑一次', async () => {
    const run = vi.fn(async () => {
      throw new Error('nope')
    })
    await expect(withRetry(run, { retries: 0, sleep: noSleep })).rejects.toThrow('nope')
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('shouldRetry 返回 false 时立刻放弃', async () => {
    const run = vi.fn(async () => {
      throw new Error('4xx')
    })
    await expect(
      withRetry(run, { retries: 5, sleep: noSleep, shouldRetry: () => false })
    ).rejects.toThrow('4xx')
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('已取消时不再重试', async () => {
    let aborted = false
    const run = vi.fn(async () => {
      aborted = true
      throw new Error('canceled mid-flight')
    })
    await expect(
      withRetry(run, { retries: 5, sleep: noSleep, isAborted: () => aborted })
    ).rejects.toThrow('canceled mid-flight')
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('每次重试都会回调，便于记账', async () => {
    const onRetry = vi.fn()
    await withRetry(
      async (attempt) => {
        if (attempt < 3) throw new Error('flaky')
        return 'ok'
      },
      { retries: 3, sleep: noSleep, onRetry }
    )
    expect(onRetry).toHaveBeenCalledTimes(2)
  })

  it('退避时间递增且有上限', () => {
    expect(defaultBackoffMs(1)).toBe(500)
    expect(defaultBackoffMs(2)).toBe(1000)
    expect(defaultBackoffMs(3)).toBe(2000)
    expect(defaultBackoffMs(20)).toBe(8000)
  })
})
