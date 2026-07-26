import { requestJson } from '../shared/api'
import { runWithConcurrency, withRetry } from '../shared/concurrency'
import { planParts } from '../shared/upload-plan'

/**
 * 上传引擎。
 *
 * 旧实现把所有文件塞进一个 FormData 一次 POST，服务端再用 `formData()` 整体读进内存，
 * 于是单请求体积限制（Free/Pro 100MB）直接变成上传上限，进度条也只能是假的。
 *
 * 现在每个文件独立走：小文件一次直传，大文件按片走 R2 分片上传。请求用 XHR 发，
 * 这样能拿到真实的字节级进度并支持中途取消——`fetch` 给不了上传进度事件。
 */

export type UploadItem = {
  file: File
  /** 目标完整路径（含目录前缀），由调用方拼好。 */
  path: string
}

export type UploadFileStatus = 'pending' | 'uploading' | 'done' | 'failed' | 'canceled'

export type UploadFileState = {
  name: string
  path: string
  size: number
  uploadedBytes: number
  status: UploadFileStatus
  error: string | null
}

export type UploadSnapshot = {
  files: UploadFileState[]
  totalBytes: number
  uploadedBytes: number
  elapsedMs: number
  done: number
  failed: number
  canceled: boolean
  finished: boolean
}

export type UploadConfig = {
  partSize: number
  maxPartCount: number
  maxFileBytes: number
}

type UploaderOptions = {
  onSnapshot: (snapshot: UploadSnapshot) => void
  /** 单个文件内部同时上传的分片数。 */
  partConcurrency?: number
  /** 同时上传的文件数。 */
  fileConcurrency?: number
  retries?: number
}

class CanceledError extends Error {
  constructor() {
    super('上传已取消')
    this.name = 'CanceledError'
  }
}

export function createUploader(options: UploaderOptions) {
  const partConcurrency = options.partConcurrency ?? 3
  const fileConcurrency = options.fileConcurrency ?? 2
  const retries = options.retries ?? 3

  let config: UploadConfig | null = null
  let running = false
  let canceled = false
  const liveRequests = new Set<XMLHttpRequest>()
  /** 已经 create 但还没 complete 的分片上传，取消时要逐个 abort 掉，否则残片会留在 R2 里计费。 */
  const openUploads = new Map<string, string>()

  const track = (xhr: XMLHttpRequest): (() => void) => {
    liveRequests.add(xhr)
    return () => liveRequests.delete(xhr)
  }

  const loadConfig = async (): Promise<UploadConfig> => {
    config ??= await requestJson<UploadConfig>('/api/upload/config')
    return config
  }

  return {
    isRunning: (): boolean => running,

    cancel: (): void => {
      if (!running) return
      canceled = true
      for (const xhr of [...liveRequests]) xhr.abort()
      liveRequests.clear()
      // abort 请求不等结果：取消要立刻生效，残片清理是尽力而为。
      for (const [path, uploadId] of openUploads) {
        void requestJson('/api/upload/multipart/abort', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ path, uploadId })
        }).catch(() => undefined)
      }
      openUploads.clear()
    },

    start: async (items: UploadItem[]): Promise<UploadSnapshot> => {
      const states: UploadFileState[] = items.map((item) => ({
        name: item.file.name,
        path: item.path,
        size: item.file.size,
        uploadedBytes: 0,
        status: 'pending',
        error: null
      }))
      const totalBytes = states.reduce((total, state) => total + state.size, 0)
      const startedAt = Date.now()

      running = true
      canceled = false
      openUploads.clear()

      const snapshot = (): UploadSnapshot => ({
        files: states,
        totalBytes,
        uploadedBytes: states.reduce((total, state) => total + state.uploadedBytes, 0),
        elapsedMs: Date.now() - startedAt,
        done: states.filter((state) => state.status === 'done').length,
        failed: states.filter((state) => state.status === 'failed').length,
        canceled,
        finished: false
      })

      let scheduled = false
      const publish = (): void => {
        if (scheduled) return
        scheduled = true
        // 合并到下一帧，避免每个 progress 事件都触发一次重排。
        window.requestAnimationFrame(() => {
          scheduled = false
          options.onSnapshot(snapshot())
        })
      }

      try {
        const uploadConfig = await loadConfig()

        await runWithConcurrency(items, fileConcurrency, async (item, index) => {
          const state = states[index] as UploadFileState
          if (canceled) {
            state.status = 'canceled'
            publish()
            return
          }

          state.status = 'uploading'
          publish()

          try {
            if (item.file.size > uploadConfig.maxFileBytes) {
              throw new Error(`文件超过单文件上限（约 ${Math.floor(uploadConfig.maxFileBytes / 1024 ** 3)} GB）`)
            }
            if (item.file.size <= uploadConfig.partSize) {
              await uploadDirect(item, state, publish, track, () => canceled, retries)
            } else {
              await uploadMultipart(item, state, uploadConfig, publish, track, () => canceled, retries, {
                partConcurrency,
                openUploads
              })
            }
            state.uploadedBytes = state.size
            state.status = 'done'
          } catch (error) {
            if (canceled || error instanceof CanceledError) {
              state.status = 'canceled'
            } else {
              state.status = 'failed'
              state.error = error instanceof Error ? error.message : '上传失败'
            }
          }
          publish()
        })
      } finally {
        running = false
      }

      const final: UploadSnapshot = { ...snapshot(), finished: true }
      options.onSnapshot(final)
      return final
    }
  }
}

type TrackFn = (xhr: XMLHttpRequest) => () => void

async function uploadDirect(
  item: UploadItem,
  state: UploadFileState,
  publish: () => void,
  track: TrackFn,
  isCanceled: () => boolean,
  retries: number
): Promise<void> {
  await withRetry(
    async () => {
      state.uploadedBytes = 0
      await sendBytes({
        method: 'PUT',
        url: `/api/upload/direct?path=${encodeURIComponent(item.path)}`,
        body: item.file,
        contentType: item.file.type || undefined,
        track,
        isCanceled,
        onProgress: (loaded) => {
          state.uploadedBytes = Math.min(loaded, state.size)
          publish()
        }
      })
    },
    { retries, isAborted: isCanceled, shouldRetry: isRetryableUploadError }
  )
}

async function uploadMultipart(
  item: UploadItem,
  state: UploadFileState,
  config: UploadConfig,
  publish: () => void,
  track: TrackFn,
  isCanceled: () => boolean,
  retries: number,
  extras: { partConcurrency: number; openUploads: Map<string, string> }
): Promise<void> {
  const plan = planParts(item.file.size, config.partSize)
  if (plan.length > config.maxPartCount) throw new Error('文件过大，超过分片数量上限')

  const created = await requestJson<{ key: string; uploadId: string; partSize: number }>('/api/upload/multipart', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-file-content-type': item.file.type || '' },
    body: JSON.stringify({ path: item.path })
  })
  if (isCanceled()) throw new CanceledError()
  extras.openUploads.set(item.path, created.uploadId)

  // 每片单独记账，重试某一片时不会把整体进度算重。
  const partProgress = new Map<number, number>()
  const republish = (): void => {
    let uploaded = 0
    for (const value of partProgress.values()) uploaded += value
    state.uploadedBytes = Math.min(uploaded, state.size)
    publish()
  }

  const uploaded: Array<{ partNumber: number; etag: string }> = []

  try {
    await runWithConcurrency(plan, extras.partConcurrency, async (entry) => {
      if (isCanceled()) throw new CanceledError()
      const part = await withRetry(
        async () => {
          partProgress.set(entry.partNumber, 0)
          republish()
          return await sendBytes<{ partNumber: number; etag: string }>({
            method: 'PUT',
            url: `/api/upload/multipart/part?path=${encodeURIComponent(item.path)}&uploadId=${encodeURIComponent(created.uploadId)}&partNumber=${entry.partNumber}`,
            body: item.file.slice(entry.start, entry.end),
            track,
            isCanceled,
            onProgress: (loaded) => {
              partProgress.set(entry.partNumber, Math.min(loaded, entry.end - entry.start))
              republish()
            }
          })
        },
        { retries, isAborted: isCanceled, shouldRetry: isRetryableUploadError }
      )
      partProgress.set(entry.partNumber, entry.end - entry.start)
      uploaded.push({ partNumber: part.partNumber, etag: part.etag })
      republish()
    })

    if (isCanceled()) throw new CanceledError()

    await requestJson('/api/upload/multipart/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: item.path, uploadId: created.uploadId, parts: uploaded })
    })
    extras.openUploads.delete(item.path)
  } catch (error) {
    // 失败时主动 abort，避免已上传的分片长期占用 R2 存储。
    extras.openUploads.delete(item.path)
    await requestJson('/api/upload/multipart/abort', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: item.path, uploadId: created.uploadId })
    }).catch(() => undefined)
    throw error
  }
}

type SendOptions = {
  method: 'PUT' | 'POST'
  url: string
  body: Blob
  contentType?: string | undefined
  track: TrackFn
  isCanceled: () => boolean
  onProgress: (loaded: number) => void
}

/**
 * 用 XHR 发一段字节并汇报进度。
 * `fetch` 没有上传进度事件，也不方便在中途干净地掐掉，所以这里保留 XHR。
 */
function sendBytes<T = unknown>(options: SendOptions): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (options.isCanceled()) {
      reject(new CanceledError())
      return
    }

    const xhr = new XMLHttpRequest()
    const untrack = options.track(xhr)
    xhr.open(options.method, options.url, true)
    if (options.contentType) xhr.setRequestHeader('content-type', options.contentType)

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) options.onProgress(event.loaded)
    })
    xhr.addEventListener('load', () => {
      untrack()
      const payload = parseBody(xhr)
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload as T)
        return
      }
      reject(new UploadRequestError(readErrorMessage(payload, xhr.statusText || '上传失败'), xhr.status))
    })
    xhr.addEventListener('error', () => {
      untrack()
      reject(new UploadRequestError('网络错误，上传中断', 0))
    })
    xhr.addEventListener('abort', () => {
      untrack()
      reject(new CanceledError())
    })
    xhr.addEventListener('timeout', () => {
      untrack()
      reject(new UploadRequestError('上传超时', 0))
    })

    xhr.send(options.body)
  })
}

export class UploadRequestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'UploadRequestError'
    this.status = status
  }
}

/** 4xx 是请求本身有问题，重试没意义；网络错误和 5xx 才值得再试。 */
export function isRetryableUploadError(error: unknown): boolean {
  if (error instanceof CanceledError) return false
  if (error instanceof UploadRequestError) return error.status === 0 || error.status >= 500 || error.status === 429
  return true
}

function parseBody(xhr: XMLHttpRequest): unknown {
  const contentType = xhr.getResponseHeader('content-type') || ''
  if (!contentType.includes('application/json')) return xhr.responseText
  try {
    return JSON.parse(xhr.responseText) as unknown
  } catch {
    return xhr.responseText
  }
}

function readErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'string' && payload) return payload
  if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') return payload.error
  return fallback
}
