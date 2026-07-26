import { formatBytes } from './format'

export type PartPlanEntry = {
  partNumber: number
  start: number
  /** 不含端，等价于 `Blob.slice(start, end)` 的第二个参数。 */
  end: number
}

/**
 * 把文件按片大小切开。
 *
 * R2 要求除最后一片外所有片等大，所以只有末片可能偏小；片号从 1 开始。
 * 零字节文件返回空计划——那种文件走直传，不需要分片。
 */
export function planParts(size: number, partSize: number): PartPlanEntry[] {
  if (!Number.isFinite(partSize) || partSize <= 0) throw new Error('片大小必须是正数')
  if (!Number.isFinite(size) || size <= 0) return []

  const plan: PartPlanEntry[] = []
  let start = 0
  let partNumber = 1
  while (start < size) {
    const end = Math.min(start + partSize, size)
    plan.push({ partNumber, start, end })
    start = end
    partNumber += 1
  }
  return plan
}

/** 剩余秒数；样本不足或已经传完时返回 null，让调用方显示占位符而不是假数字。 */
export function estimateSeconds(uploadedBytes: number, totalBytes: number, elapsedMs: number): number | null {
  if (elapsedMs <= 0 || uploadedBytes <= 0 || uploadedBytes >= totalBytes) return null
  const bytesPerMs = uploadedBytes / elapsedMs
  if (bytesPerMs <= 0) return null
  return Math.ceil((totalBytes - uploadedBytes) / bytesPerMs / 1000)
}

export function bytesPerSecond(uploadedBytes: number, elapsedMs: number): number {
  if (elapsedMs <= 0 || uploadedBytes <= 0) return 0
  return (uploadedBytes / elapsedMs) * 1000
}

export function formatSpeed(bytesEachSecond: number): string {
  if (bytesEachSecond <= 0) return '-'
  return `${formatBytes(bytesEachSecond)}/s`
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '-'
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} 秒`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分 ${String(Math.floor(seconds % 60)).padStart(2, '0')} 秒`
  const hours = Math.floor(minutes / 60)
  return `${hours} 小时 ${String(minutes % 60).padStart(2, '0')} 分`
}

export function formatPercent(uploadedBytes: number, totalBytes: number): number {
  if (totalBytes <= 0) return 0
  return Math.min(100, Math.max(0, Math.floor((uploadedBytes / totalBytes) * 100)))
}
