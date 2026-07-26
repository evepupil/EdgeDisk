import { describe, expect, it } from 'vitest'
import { estimateSeconds, formatDuration, formatPercent, formatSpeed, planParts } from './upload-plan'

describe('planParts', () => {
  it('小于一片的文件只切出一片', () => {
    expect(planParts(100, 1024)).toEqual([{ partNumber: 1, start: 0, end: 100 }])
  })

  it('刚好整除时不会多出一片空片', () => {
    expect(planParts(20, 10)).toEqual([
      { partNumber: 1, start: 0, end: 10 },
      { partNumber: 2, start: 10, end: 20 }
    ])
  })

  it('末片可以偏小，其余片等大（R2 的硬要求）', () => {
    const plan = planParts(25, 10)
    expect(plan).toHaveLength(3)
    const sizes = plan.map((entry) => entry.end - entry.start)
    expect(sizes).toEqual([10, 10, 5])
    expect(new Set(sizes.slice(0, -1)).size).toBe(1)
  })

  it('片号从 1 开始且连续', () => {
    expect(planParts(35, 10).map((entry) => entry.partNumber)).toEqual([1, 2, 3, 4])
  })

  it('切片首尾相接、完整覆盖整个文件', () => {
    const size = 1234
    const plan = planParts(size, 100)
    expect(plan[0]?.start).toBe(0)
    expect(plan.at(-1)?.end).toBe(size)
    for (let index = 1; index < plan.length; index += 1) {
      expect(plan[index]?.start).toBe(plan[index - 1]?.end)
    }
    expect(plan.reduce((total, entry) => total + (entry.end - entry.start), 0)).toBe(size)
  })

  it('零字节文件不需要分片', () => {
    expect(planParts(0, 10)).toEqual([])
  })

  it('片大小非法时直接报错', () => {
    expect(() => planParts(10, 0)).toThrow()
    expect(() => planParts(10, -1)).toThrow()
    expect(() => planParts(10, Number.NaN)).toThrow()
  })
})

describe('estimateSeconds', () => {
  it('按已用时间线性外推剩余时间', () => {
    // 1 秒传了 100 字节，还剩 900 字节，约 9 秒
    expect(estimateSeconds(100, 1000, 1000)).toBe(9)
  })

  it('样本不足或已传完时返回 null，不编造数字', () => {
    expect(estimateSeconds(0, 1000, 1000)).toBeNull()
    expect(estimateSeconds(100, 1000, 0)).toBeNull()
    expect(estimateSeconds(1000, 1000, 1000)).toBeNull()
  })
})

describe('formatPercent', () => {
  it('正常换算并向下取整', () => {
    expect(formatPercent(0, 100)).toBe(0)
    expect(formatPercent(999, 1000)).toBe(99)
    expect(formatPercent(1000, 1000)).toBe(100)
  })

  it('总量为零或进度越界时给出安全值', () => {
    expect(formatPercent(0, 0)).toBe(0)
    expect(formatPercent(1500, 1000)).toBe(100)
    expect(formatPercent(-10, 1000)).toBe(0)
  })
})

describe('formatSpeed 与 formatDuration', () => {
  it('速度为零时显示占位符', () => {
    expect(formatSpeed(0)).toBe('-')
    expect(formatSpeed(-1)).toBe('-')
  })

  it('速度带单位后缀', () => {
    expect(formatSpeed(2048)).toMatch(/\/s$/)
  })

  it('时长按秒、分、小时分档', () => {
    expect(formatDuration(9)).toBe('9 秒')
    expect(formatDuration(65)).toBe('1 分 05 秒')
    expect(formatDuration(3725)).toBe('1 小时 02 分')
  })

  it('无法估算时显示占位符', () => {
    expect(formatDuration(null)).toBe('-')
    expect(formatDuration(-1)).toBe('-')
    expect(formatDuration(Number.NaN)).toBe('-')
  })
})
