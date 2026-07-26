import type { ImportTaskStatus } from '../types.ts'

/**
 * 导入任务的状态流转规则。
 *
 * 单独成文件是为了能脱离 D1 单测——判断「这个任务能不能取消」不该需要一个数据库。
 *
 * 状态图：
 *   queued  ──> running ──> succeeded
 *     │           │    └──> failed ──┐
 *     │           │                  │
 *     └───────────┴──> canceled <────┘  (canceled / failed 可以重新回到 queued)
 */

export const CANCELABLE_STATUSES: readonly ImportTaskStatus[] = ['queued', 'running']
export const RETRYABLE_STATUSES: readonly ImportTaskStatus[] = ['failed', 'canceled']
export const FINISHED_STATUSES: readonly ImportTaskStatus[] = ['succeeded', 'failed', 'canceled']

export function canCancelImportTask(status: ImportTaskStatus): boolean {
  return CANCELABLE_STATUSES.includes(status)
}

export function canRetryImportTask(status: ImportTaskStatus): boolean {
  return RETRYABLE_STATUSES.includes(status)
}

export function isFinishedImportTask(status: ImportTaskStatus): boolean {
  return FINISHED_STATUSES.includes(status)
}

/** 消费者拿到消息时，哪些状态说明这条消息已经没必要处理了。 */
export function shouldSkipImportMessage(status: ImportTaskStatus): boolean {
  return status === 'succeeded' || status === 'canceled'
}
