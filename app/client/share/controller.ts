import { getErrorMessage, requestJson } from '../shared/api'
import { closestElement, requireElement } from '../shared/dom'
import { baseName, escapeHtml, formatBytes, formatTime, getItemIcon, getMediaType, trimTrailingSlash } from '../shared/format'
import { iconMarkup, renderIcons } from '../shared/icons'
import { collectPages } from '../shared/paging'
import type { ListedFile, ShareFolderView, ShareView } from '../shared/types'

export function initSharePage(): void {
  const root = requireElement<HTMLDivElement>('share-page')
  const elements = {
    crumbs: requireElement<HTMLElement>('crumbs'),
    refresh: requireElement<HTMLButtonElement>('refresh'),
    downloadSelected: requireElement<HTMLButtonElement>('downloadSelected'),
    status: requireElement<HTMLElement>('status'),
    rows: requireElement<HTMLTableSectionElement>('rows'),
    shareTitle: requireElement<HTMLElement>('shareTitle'),
    shareMetaCount: requireElement<HTMLElement>('shareMetaCount'),
    shareMetaSize: requireElement<HTMLElement>('shareMetaSize'),
    shareExpiryView: requireElement<HTMLElement>('shareExpiryView'),
    shareSelectionCopy: requireElement<HTMLElement>('shareSelectionCopy'),
    playerDialog: requireElement<HTMLDialogElement>('playerDialog'),
    playerTitle: requireElement<HTMLElement>('playerTitle'),
    playerContainer: requireElement<HTMLDivElement>('playerContainer'),
    playerDownload: requireElement<HTMLAnchorElement>('playerDownload'),
    closePlayer: requireElement<HTMLButtonElement>('closePlayer'),
  }

  const state = {
    code: root.dataset.shareCode || '',
    sub: '',
    selected: new Set<string>(),
    mode: 'folder' as 'file' | 'folder',
  }

  /** 每次切目录自增，用来丢弃切走之后才回来的旧分页请求。 */
  let loadToken = 0

  const setStatus = (text: string, kind: '' | 'success' | 'warning' | 'error' = ''): void => {
    elements.status.textContent = text
    elements.status.className = kind ? `status ${kind}` : 'status'
  }

  const sharedUrl = (path: string, download: boolean): string => path
    ? `/s/${state.code}/file?path=${encodeURIComponent(path)}${download ? '&download=1' : ''}`
    : `/s/${state.code}/file${download ? '?download=1' : ''}`

  const updateSelection = (): void => {
    const count = state.selected.size
    elements.downloadSelected.disabled = state.mode !== 'folder' || count === 0
    elements.shareSelectionCopy.textContent = count ? `已选择 ${count} 个文件` : '请选择需要下载的文件'
    for (const checkbox of elements.rows.querySelectorAll<HTMLInputElement>('[data-pick]')) checkbox.checked = Boolean(checkbox.dataset.pick && state.selected.has(checkbox.dataset.pick))
  }

  const renderCrumbs = (): void => {
    const parts = trimTrailingSlash(state.sub).split('/').filter(Boolean)
    const html = [`<button type="button" data-sub="">${iconMarkup('folder-open')}<span>分享根目录</span></button>`]
    let current = ''
    for (const part of parts) {
      current += `${part}/`
      html.push(`<span>/</span><button type="button" data-sub="${escapeHtml(current)}">${escapeHtml(part)}</button>`)
    }
    elements.crumbs.innerHTML = html.join('')
    renderIcons(elements.crumbs)
  }

  const renderSummary = (data: ShareView): void => {
    const count = data.kind === 'folder' ? data.folders.length + data.files.length : 1
    const size = data.kind === 'folder' ? data.files.reduce((total, file) => total + file.size, 0) : data.file.size
    elements.shareTitle.textContent = baseName(data.rootPath)
    elements.shareMetaCount.textContent = `${count} 个项目`
    elements.shareMetaSize.textContent = formatBytes(size)
    elements.shareExpiryView.textContent = data.expiresAt ? `有效期至 ${formatTime(data.expiresAt)}` : '永久有效'
  }

  const renderRows = (data: ShareView): void => {
    state.selected.clear()
    state.mode = data.kind
    updateSelection()

    if (data.kind === 'file') {
      elements.rows.innerHTML = renderFileRow(data.file, '', true)
      renderIcons(elements.rows)
      return
    }

    if (!data.folders.length && !data.files.length) {
      elements.rows.innerHTML = `<tr><td colspan="5"><div class="empty-state">${iconMarkup('folder-open')}<strong>这个分享目录暂无文件</strong></div></td></tr>`
      renderIcons(elements.rows)
      return
    }

    elements.rows.innerHTML = [
      ...data.folders.map((folder) => `<tr data-folder="${escapeHtml(folder.subpath || '')}"><td class="check-cell"></td><td><div class="item-name"><span class="item-icon folder">${iconMarkup('folder')}</span><strong class="name-text">${escapeHtml(folder.name)}</strong></div></td><td class="size-cell secondary">-</td><td class="time-cell secondary">-</td><td class="share-action-cell"><button class="icon-btn" type="button" data-enter="${escapeHtml(folder.subpath || '')}" aria-label="进入文件夹">${iconMarkup('chevron-right')}</button></td></tr>`),
      ...data.files.map((file) => renderFileRow(file, file.subpath || '', false)),
    ].join('')
    renderIcons(elements.rows)
  }

  const shareViewUrl = (sub: string, cursor: string | null): string => {
    const params = new URLSearchParams({ sub })
    if (cursor) params.set('cursor', cursor)
    return `/share-api/${state.code}?${params.toString()}`
  }

  const load = async (sub = state.sub): Promise<void> => {
    const token = ++loadToken
    state.sub = sub
    renderCrumbs()
    setStatus('正在加载分享内容...')
    try {
      const first = await requestJson<ShareView>(shareViewUrl(sub, null))
      if (token !== loadToken) return
      renderSummary(first)
      renderRows(first)

      if (first.kind === 'file') {
        setStatus('')
        return
      }

      const result = await collectPages<ShareFolderView>({
        first,
        fetchNext: (cursor) => requestJson<ShareFolderView>(shareViewUrl(sub, cursor)),
        merge: (accumulated, next) => ({
          ...next,
          folders: [...accumulated.folders, ...next.folders],
          files: [...accumulated.files, ...next.files],
        }),
        isStale: () => token !== loadToken,
        onProgress: (accumulated) => setStatus(`正在加载分享内容...已载入 ${accumulated.folders.length + accumulated.files.length} 项`),
      })
      if (result.stale) return

      if (result.pagesLoaded > 1) {
        renderSummary(result.value)
        renderRows(result.value)
      }
      const loaded = result.value.folders.length + result.value.files.length
      setStatus(
        result.capped ? `内容较多，已载入前 ${loaded} 项；进入子目录可查看其余内容` : '',
        result.capped ? 'warning' : ''
      )
    } catch (error) {
      if (token !== loadToken) return
      setStatus(getErrorMessage(error, '分享加载失败'), 'error')
    }
  }

  const openPlayer = (subpath: string, name: string): void => {
    const mediaType = getMediaType(name)
    if (!mediaType) {
      window.open(sharedUrl(subpath, false), '_blank', 'noopener')
      return
    }
    const url = sharedUrl(subpath, false)
    elements.playerTitle.textContent = name
    elements.playerContainer.innerHTML = mediaType === 'video'
      ? `<video controls src="${url}"></video>`
      : `<div class="audio-player">${iconMarkup('file-audio')}<audio controls src="${url}"></audio></div>`
    elements.playerDownload.href = sharedUrl(subpath, true)
    elements.playerDownload.download = name
    elements.playerDialog.showModal()
    renderIcons(elements.playerDialog)
  }

  const renderFileRow = (file: Pick<ListedFile, 'name' | 'size' | 'uploaded'>, subpath: string, directFile: boolean): string => {
    const media = getMediaType(file.name)
    return `<tr data-file="${escapeHtml(subpath)}" data-name="${escapeHtml(file.name)}">
      <td class="check-cell">${directFile ? '' : `<input type="checkbox" data-pick="${escapeHtml(subpath)}" aria-label="选择 ${escapeHtml(file.name)}">`}</td>
      <td><div class="item-name"><span class="item-icon">${iconMarkup(getItemIcon({ kind: 'file', name: file.name }))}</span><span class="name-text">${escapeHtml(file.name)}</span></div></td>
      <td class="size-cell secondary">${escapeHtml(formatBytes(file.size))}</td><td class="time-cell secondary">${escapeHtml(formatTime(file.uploaded))}</td>
      <td class="share-action-cell"><div class="share-row-actions">${directFile ? `<a class="btn ghost icon-only" href="${sharedUrl(subpath, true)}" download aria-label="下载 ${escapeHtml(file.name)}">${iconMarkup('download')}</a>` : media ? `<button class="btn ghost icon-only" type="button" data-play="${escapeHtml(subpath)}" aria-label="预览 ${escapeHtml(file.name)}">${iconMarkup('play')}</button>` : `<button class="btn ghost icon-only" type="button" data-open="${escapeHtml(subpath)}" aria-label="打开 ${escapeHtml(file.name)}">${iconMarkup('external-link')}</button>`}</div></td>
    </tr>`
  }

  elements.crumbs.addEventListener('click', (event) => {
    const sub = closestElement(event.target, '[data-sub]')?.dataset.sub
    if (sub != null) void load(sub)
  })
  elements.rows.addEventListener('click', (event) => {
    const folder = closestElement(event.target, '[data-enter], [data-folder]')
    const targetSub = folder?.dataset.enter ?? folder?.dataset.folder
    if (targetSub != null) { void load(targetSub); return }
    const play = closestElement(event.target, '[data-play]')
    const open = closestElement(event.target, '[data-open]')
    const action = play || open
    if (!action) return
    const row = action.closest<HTMLElement>('[data-name]')
    if (row?.dataset.name) openPlayer(action.dataset.play ?? action.dataset.open ?? '', row.dataset.name)
  })
  elements.rows.addEventListener('change', (event) => {
    const checkbox = event.target instanceof HTMLInputElement ? event.target.closest<HTMLInputElement>('[data-pick]') : null
    const path = checkbox?.dataset.pick
    if (!checkbox || !path) return
    if (checkbox.checked) state.selected.add(path)
    else state.selected.delete(path)
    updateSelection()
  })

  elements.refresh.addEventListener('click', () => void load(state.sub))
  elements.downloadSelected.addEventListener('click', () => state.selected.forEach((path) => window.open(sharedUrl(path, true), '_blank', 'noopener')))
  elements.closePlayer.addEventListener('click', () => { elements.playerContainer.replaceChildren(); elements.playerDialog.close() })
  renderIcons()
  void load('')
}
