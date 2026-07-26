import { baseName, escapeHtml, formatBytes, formatTime, getItemIcon, getMediaType } from '../shared/format'
import { iconMarkup, renderIcons } from '../shared/icons'
import { bytesPerSecond, estimateSeconds, formatDuration, formatPercent, formatSpeed } from '../shared/upload-plan'
import type { ImportTask, ListedItem, ObjectDetail, ShareItem, TrashItem } from '../shared/types'
import type { DashboardElements } from './elements'
import type { UploadFileState, UploadSnapshot } from './uploader'

const numberFormat = new Intl.NumberFormat('zh-CN')
const taskLabels: Record<ImportTask['status'], string> = { queued: '排队中', running: '导入中', succeeded: '已完成', failed: '失败', canceled: '已取消' }
const CANCELABLE_TASK_STATUSES: ReadonlySet<ImportTask['status']> = new Set(['queued', 'running'])
const RETRYABLE_TASK_STATUSES: ReadonlySet<ImportTask['status']> = new Set(['failed', 'canceled'])

export function renderCrumbs(container: HTMLElement, prefix: string): void {
  const parts = prefix.replace(/\/$/, '').split('/').filter(Boolean)
  const html = [`<button type="button" data-prefix="">${iconMarkup('house')}<span>根目录</span></button>`]
  let current = ''
  for (const part of parts) {
    current += `${part}/`
    html.push(`<span>/</span><button type="button" data-prefix="${escapeHtml(current)}">${escapeHtml(part)}</button>`)
  }
  container.innerHTML = html.join('')
  renderIcons(container)
}

export function renderDirectory(elements: DashboardElements, items: ListedItem[], selected: Set<string>): void {
  elements.itemCount.textContent = `${numberFormat.format(items.length)} 个项目`
  elements.fileNavCount.textContent = numberFormat.format(items.length)

  if (!items.length) {
    const empty = `<tr><td colspan="5"><div class="empty-state">${iconMarkup('search-x')}<strong>当前目录没有匹配的项目</strong><span>可以调整搜索条件，或直接上传文件。</span></div></td></tr>`
    elements.rows.innerHTML = empty
    elements.iconView.innerHTML = `<div class="empty-state">${iconMarkup('search-x')}<strong>当前目录没有匹配的项目</strong></div>`
    renderIcons(elements.rows)
    renderIcons(elements.iconView)
    return
  }

  elements.rows.innerHTML = items.map((item) => renderTableRow(item, selected.has(item.path))).join('')
  elements.iconView.innerHTML = items.map((item) => renderGridItem(item, selected.has(item.path))).join('')
  renderIcons(elements.rows)
  renderIcons(elements.iconView)
}

export function updateSelectionView(elements: DashboardElements, visibleItems: ListedItem[], selected: Set<string>): void {
  const count = selected.size
  elements.selectionBar.classList.toggle('hidden', count === 0)
  elements.selectionCount.textContent = numberFormat.format(count)
  const visiblePaths = visibleItems.map((item) => item.path)
  const selectedVisible = visiblePaths.filter((path) => selected.has(path)).length
  elements.selectAll.checked = visiblePaths.length > 0 && selectedVisible === visiblePaths.length
  elements.selectAll.indeterminate = selectedVisible > 0 && selectedVisible < visiblePaths.length

  const selectedItems = visibleItems.filter((item) => selected.has(item.path))
  elements.downloadSelected.disabled = !selectedItems.some((item) => item.kind === 'file')
  elements.shareSelected.disabled = count !== 1
  elements.moveSelected.disabled = count === 0
  elements.deleteSelected.disabled = count === 0
}

export function renderDetail(elements: DashboardElements, detail: ObjectDetail): void {
  elements.detailName.textContent = detail.name
  const iconName = getItemIcon({ kind: detail.kind, name: detail.name })
  elements.detailPreview.innerHTML = iconMarkup(iconName)
  const rows: Array<[string, string]> = [
    ['类型', detail.kind === 'folder' ? '文件夹' : detail.contentType || '文件'],
    ['大小', detail.kind === 'folder' ? formatBytes(detail.totalSize) : formatBytes(detail.size)],
    ['更新时间', formatTime(detail.uploaded)],
    ['路径', detail.path],
  ]
  if (detail.kind === 'folder') rows.splice(2, 0, ['项目数', numberFormat.format(detail.childCount || 0)])
  elements.detailBody.innerHTML = rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')
  elements.openFile.classList.toggle('hidden', detail.kind === 'folder')
  elements.downloadFile.classList.toggle('hidden', detail.kind === 'folder')
  elements.detailPanel.classList.remove('hidden')
  elements.contentGrid.classList.add('with-detail')
  renderIcons(elements.detailPreview)
}

export function renderImportTasks(container: HTMLElement, tasks: ImportTask[]): void {
  if (!tasks.length) {
    container.innerHTML = `<div class="empty-state">${iconMarkup('cloud-download')}<strong>暂无导入任务</strong></div>`
    renderIcons(container)
    return
  }

  container.innerHTML = tasks.map((task) => {
    const title = task.resolvedFileName || task.requestedFileName || task.targetPath || task.sourceUrl
    const statusClass = task.status === 'succeeded' ? 'success' : task.status === 'failed' ? 'error' : task.status === 'running' ? 'running' : 'warning'
    const cancel = CANCELABLE_TASK_STATUSES.has(task.status)
      ? `<button class="icon-btn" type="button" data-task-cancel="${escapeHtml(task.id)}" aria-label="取消任务" data-tooltip="取消任务">${iconMarkup('circle-x')}</button>`
      : ''
    const retry = RETRYABLE_TASK_STATUSES.has(task.status)
      ? `<button class="icon-btn" type="button" data-task-retry="${escapeHtml(task.id)}" aria-label="重试任务" data-tooltip="重试任务">${iconMarkup('restore')}</button>`
      : ''
    return `<article class="data-row">
      <div class="data-row-main"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(task.targetPath || task.directory || '/')}</span></div>
      <span class="hide-mobile data-cell-muted">${escapeHtml(hostName(task.sourceUrl))}</span>
      <span class="status-pill ${statusClass}">${task.status === 'running' ? iconMarkup('loader') : ''}${escapeHtml(taskLabels[task.status])}</span>
      <span class="hide-tablet data-cell-muted">${escapeHtml(formatTime(task.updatedAt))}</span>
      <div class="data-row-actions">${cancel}${retry}<button class="icon-btn" type="button" data-task-id="${escapeHtml(task.id)}" aria-label="查看任务详情">${iconMarkup('chevron-right')}</button></div>
    </article>`
  }).join('')
  renderIcons(container)
}

export function renderTrashItems(container: HTMLElement, items: TrashItem[]): void {
  if (!items.length) {
    container.innerHTML = `<div class="empty-state">${iconMarkup('trash-2')}<strong>回收站为空</strong></div>`
    renderIcons(container)
    return
  }

  container.innerHTML = items.map((item) => `<article class="data-row">
    <div class="data-row-main"><strong>${escapeHtml(baseName(item.originalPath))}</strong><span>${escapeHtml(item.originalPath)}</span></div>
    <span class="hide-mobile data-cell-muted">${item.kind === 'folder' ? `${numberFormat.format(item.itemCount)} 个项目` : escapeHtml(item.contentType || '文件')}</span>
    <span>${escapeHtml(formatBytes(item.totalSize))}</span>
    <span class="hide-tablet data-cell-muted">${escapeHtml(formatTime(item.deletedAt))}</span>
    <div class="data-row-actions"><button class="btn" type="button" data-trash-restore="${escapeHtml(item.id)}">${iconMarkup('restore')}恢复</button><button class="icon-btn" type="button" data-trash-delete="${escapeHtml(item.id)}" aria-label="彻底删除">${iconMarkup('trash-2')}</button></div>
  </article>`).join('')
  renderIcons(container)
}

export function renderShares(container: HTMLElement, shares: ShareItem[]): void {
  if (!shares.length) {
    container.innerHTML = '<div class="empty-state"><strong>当前项目还没有有效分享</strong></div>'
    return
  }
  container.innerHTML = shares.map((share) => `<article class="data-row share-data-row"><div class="data-row-main"><strong class="mono">${escapeHtml(share.code)}</strong><span>${escapeHtml(share.url)}</span></div><span class="data-cell-muted">${share.expiresAt ? `有效期至 ${escapeHtml(formatTime(share.expiresAt))}` : '永久有效'}</span><div class="data-row-actions"><button class="icon-btn" type="button" data-copy-url="${escapeHtml(share.url)}" aria-label="复制分享链接">${iconMarkup('copy')}</button><button class="icon-btn" type="button" data-revoke="${escapeHtml(share.code)}" aria-label="撤销分享">${iconMarkup('trash-2')}</button></div></article>`).join('')
  renderIcons(container)
}

export function renderAllShares(container: HTMLElement, shares: ShareItem[], selected: Set<string>): void {
  if (!shares.length) {
    container.innerHTML = `<div class="empty-state">${iconMarkup('share-2')}<strong>暂无分享</strong><span>可以在文件的操作菜单里创建分享链接。</span></div>`
    renderIcons(container)
    return
  }

  container.innerHTML = shares.map((share) => `<article class="data-row share-manage-row">
    <div class="share-pick"><input type="checkbox" data-share-pick="${escapeHtml(share.code)}" aria-label="选择分享 ${escapeHtml(share.code)}"${selected.has(share.code) ? ' checked' : ''}></div>
    <div class="data-row-main"><strong>${escapeHtml(share.path)}</strong><span class="mono">${escapeHtml(share.code)} · ${share.kind === 'folder' ? '文件夹' : '文件'}</span></div>
    <span class="hide-tablet data-cell-muted">${escapeHtml(formatTime(share.createdAt))}</span>
    <span class="hide-mobile data-cell-muted">${share.expiresAt ? `有效期至 ${escapeHtml(formatTime(share.expiresAt))}` : '永久有效'}</span>
    <div class="data-row-actions">
      <button class="icon-btn" type="button" data-copy-url="${escapeHtml(share.url)}" aria-label="复制分享链接" data-tooltip="复制链接">${iconMarkup('copy')}</button>
      <button class="icon-btn" type="button" data-share-open="${escapeHtml(share.url)}" aria-label="打开分享页" data-tooltip="打开分享页">${iconMarkup('external-link')}</button>
      <button class="icon-btn" type="button" data-revoke="${escapeHtml(share.code)}" aria-label="撤销分享" data-tooltip="撤销分享">${iconMarkup('trash-2')}</button>
    </div>
  </article>`).join('')
  renderIcons(container)
}

export function updateShareSelectionView(elements: DashboardElements, selected: Set<string>): void {
  elements.shareSelectionBar.classList.toggle('hidden', selected.size === 0)
  elements.shareSelectionCount.textContent = numberFormat.format(selected.size)
  elements.revokeSelectedShares.disabled = selected.size === 0
}

export function renderImportTaskDetail(container: HTMLDListElement, task: ImportTask): void {
  const rows: Array<[string, string]> = [
    ['任务 ID', task.id], ['状态', taskLabels[task.status]], ['来源地址', task.sourceUrl], ['目标路径', task.targetPath || task.directory || '/'],
    ['覆盖同名', task.overwrite ? '是' : '否'], ['尝试次数', numberFormat.format(task.attempts)], ['文件大小', formatBytes(task.contentLength)],
    ['创建时间', formatTime(task.createdAt)], ['开始时间', formatTime(task.startedAt)], ['完成时间', formatTime(task.finishedAt)], ['错误信息', task.error || '-'],
  ]
  container.innerHTML = rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')
}

const uploadStatusIcon: Record<UploadFileState['status'], string> = {
  pending: 'file',
  uploading: 'loader',
  done: 'check',
  failed: 'circle-alert',
  canceled: 'circle-x'
}

export function renderUploadActivity(elements: DashboardElements, snapshot: UploadSnapshot): void {
  const percent = formatPercent(snapshot.uploadedBytes, snapshot.totalBytes)
  elements.uploadProgress.style.width = `${percent}%`
  elements.uploadPercent.textContent = `${percent}%`

  const total = snapshot.files.length
  if (snapshot.finished) {
    const canceled = snapshot.files.filter((file) => file.status === 'canceled').length
    elements.uploadTitle.textContent = snapshot.failed || canceled ? '上传结束，部分文件未完成' : '上传完成'
    elements.uploadMeta.textContent = [
      `成功 ${snapshot.done} / ${total}`,
      snapshot.failed ? `失败 ${snapshot.failed}` : '',
      canceled ? `已取消 ${canceled}` : '',
      `共 ${formatBytes(snapshot.uploadedBytes)}`
    ].filter(Boolean).join(' · ')
  } else {
    const speed = bytesPerSecond(snapshot.uploadedBytes, snapshot.elapsedMs)
    const remaining = estimateSeconds(snapshot.uploadedBytes, snapshot.totalBytes, snapshot.elapsedMs)
    elements.uploadTitle.textContent = `正在上传 ${snapshot.done + 1} / ${total}`
    elements.uploadMeta.textContent = [
      `${formatBytes(snapshot.uploadedBytes)} / ${formatBytes(snapshot.totalBytes)}`,
      formatSpeed(speed),
      `剩余 ${formatDuration(remaining)}`
    ].join(' · ')
  }

  elements.uploadList.innerHTML = snapshot.files.map(renderUploadRow).join('')
  renderIcons(elements.uploadList)
}

function renderUploadRow(file: UploadFileState): string {
  const percent = formatPercent(file.uploadedBytes, file.size)
  const meta = file.status === 'failed'
    ? escapeHtml(file.error || '失败')
    : file.status === 'canceled'
      ? '已取消'
      : file.status === 'done'
        ? escapeHtml(formatBytes(file.size))
        : `${percent}%`
  return `<div class="upload-row ${file.status}">
    <div class="upload-row-name">${iconMarkup(uploadStatusIcon[file.status])}<span title="${escapeHtml(file.path)}">${escapeHtml(file.name)}</span></div>
    <div class="upload-row-bar"><span style="width: ${file.status === 'done' ? 100 : percent}%"></span></div>
    <div class="upload-row-meta">${meta}</div>
  </div>`
}

function renderTableRow(item: ListedItem, selected: boolean): string {
  const icon = getItemIcon(item)
  const details = actionMenu(item)
  return `<tr class="file-row${selected ? ' selected' : ''}" data-kind="${item.kind}" data-path="${escapeHtml(item.path)}">
    <td class="check-cell"><input type="checkbox" data-select-path="${escapeHtml(item.path)}" aria-label="选择 ${escapeHtml(item.name)}"${selected ? ' checked' : ''}></td>
    <td><div class="item-name"><span class="item-icon${item.kind === 'folder' ? ' folder' : ''}">${iconMarkup(icon)}</span><span class="name-text">${escapeHtml(item.name)}</span></div></td>
    <td class="size-cell secondary">${item.kind === 'file' ? escapeHtml(formatBytes(item.size)) : '-'}</td>
    <td class="time-cell secondary">${item.kind === 'file' ? escapeHtml(formatTime(item.uploaded)) : '-'}</td>
    <td class="menu-cell">${details}</td>
  </tr>`
}

function renderGridItem(item: ListedItem, selected: boolean): string {
  return `<article class="file-card${selected ? ' selected' : ''}" data-kind="${item.kind}" data-path="${escapeHtml(item.path)}">
    <div class="file-card-head"><input type="checkbox" data-select-path="${escapeHtml(item.path)}" aria-label="选择 ${escapeHtml(item.name)}"${selected ? ' checked' : ''}>${actionMenu(item)}</div>
    <span class="file-card-icon${item.kind === 'folder' ? ' folder' : ''}">${iconMarkup(getItemIcon(item))}</span>
    <strong class="file-card-name">${escapeHtml(item.name)}</strong>
    <span class="file-card-meta">${item.kind === 'file' ? escapeHtml(formatBytes(item.size)) : '文件夹'}</span>
  </article>`
}

function actionMenu(item: ListedItem): string {
  const play = item.kind === 'file' && getMediaType(item.name) ? `<button type="button" data-action="play">${iconMarkup('play')}播放</button>` : ''
  const enter = item.kind === 'folder' ? `<button type="button" data-action="enter">${iconMarkup('folder-open')}进入</button>` : ''
  return `<details class="row-menu"><summary aria-label="${escapeHtml(item.name)} 操作">${iconMarkup('ellipsis')}</summary><div class="menu-popover">${enter}${play}<button type="button" data-action="detail">${iconMarkup('info')}查看详情</button><button type="button" data-action="move">${iconMarkup('move')}移动或重命名</button><button type="button" data-action="share">${iconMarkup('share-2')}分享</button><button class="danger-text" type="button" data-action="delete">${iconMarkup('trash-2')}移入回收站</button></div></details>`
}

function hostName(value: string): string {
  try { return new URL(value).host } catch { return value }
}
