import { describe, expect, it } from 'vitest'
import type { ImportTaskStatus } from '../types.ts'
import {
  FINISHED_STATUSES,
  canCancelImportTask,
  canRetryImportTask,
  isFinishedImportTask,
  shouldSkipImportMessage
} from './import-task-status.ts'

const ALL_STATUSES: ImportTaskStatus[] = ['queued', 'running', 'succeeded', 'failed', 'canceled']

describe('canCancelImportTask', () => {
  it('只允许取消还没结束的任务', () => {
    expect(canCancelImportTask('queued')).toBe(true)
    expect(canCancelImportTask('running')).toBe(true)
  })

  it('已结束的任务无法取消', () => {
    expect(canCancelImportTask('succeeded')).toBe(false)
    expect(canCancelImportTask('failed')).toBe(false)
    expect(canCancelImportTask('canceled')).toBe(false)
  })
})

describe('canRetryImportTask', () => {
  it('失败和已取消可以重试', () => {
    expect(canRetryImportTask('failed')).toBe(true)
    expect(canRetryImportTask('canceled')).toBe(true)
  })

  it('成功的任务不该重试，在跑的任务重试会重复下载', () => {
    expect(canRetryImportTask('succeeded')).toBe(false)
    expect(canRetryImportTask('queued')).toBe(false)
    expect(canRetryImportTask('running')).toBe(false)
  })
})

describe('取消与重试互斥且覆盖完整', () => {
  it('同一个状态不可能既能取消又能重试', () => {
    for (const status of ALL_STATUSES) {
      expect(canCancelImportTask(status) && canRetryImportTask(status)).toBe(false)
    }
  })

  it('除了 succeeded，每个状态至少有一个可用操作', () => {
    for (const status of ALL_STATUSES) {
      const actionable = canCancelImportTask(status) || canRetryImportTask(status)
      expect(actionable).toBe(status !== 'succeeded')
    }
  })
})

describe('isFinishedImportTask', () => {
  it('三种终态都算结束', () => {
    expect(FINISHED_STATUSES).toEqual(['succeeded', 'failed', 'canceled'])
    for (const status of FINISHED_STATUSES) expect(isFinishedImportTask(status)).toBe(true)
  })

  it('排队中和执行中不算结束', () => {
    expect(isFinishedImportTask('queued')).toBe(false)
    expect(isFinishedImportTask('running')).toBe(false)
  })
})

describe('shouldSkipImportMessage', () => {
  it('已完成和已取消的消息直接丢弃', () => {
    expect(shouldSkipImportMessage('succeeded')).toBe(true)
    expect(shouldSkipImportMessage('canceled')).toBe(true)
  })

  it('失败的任务仍要处理，否则队列重试就失效了', () => {
    expect(shouldSkipImportMessage('failed')).toBe(false)
  })

  it('排队中和执行中要正常处理', () => {
    expect(shouldSkipImportMessage('queued')).toBe(false)
    expect(shouldSkipImportMessage('running')).toBe(false)
  })
})
