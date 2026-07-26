import { getErrorMessage, requestJson } from '../shared/api'
import { closestElement, closeParentDialog } from '../shared/dom'
import { baseName, ensureFolderPath, escapeHtml, filterAndSortItems, getMediaType, normalizeInputPath, parentDirectory } from '../shared/format'
import { iconMarkup, renderIcons } from '../shared/icons'
import { collectPages } from '../shared/paging'
import type { DirectoryData, ImportTask, ListedItem, ObjectDetail, ShareItem, ShareTarget, SortMode, TrashItem, ViewMode } from '../shared/types'
import { getDashboardElements } from './elements'
import { createUploader } from './uploader'
import { renderCrumbs, renderDetail, renderDirectory, renderImportTaskDetail, renderImportTasks, renderShares, renderTrashItems, renderUploadActivity, updateSelectionView } from './view'

const viewStorageKey = 'edgedisk:view-mode'

type DashboardState = {
  prefix: string
  directory: DirectoryData
  visibleItems: ListedItem[]
  selected: Set<string>
  detail: ObjectDetail | null
  shareTarget: ShareTarget | null
  moveTargets: ShareTarget[]
  deleteTargets: ShareTarget[]
  permanentDeleteId: string | null
  importTasks: ImportTask[]
  trashItems: TrashItem[]
  viewMode: ViewMode
  sort: SortMode
  query: string
}

export function initDashboard(): void {
  const elements = getDashboardElements()
  const storedView = localStorage.getItem(viewStorageKey)
  /** 每次切目录自增，用来丢弃切走之后才回来的旧分页请求。 */
  let directoryToken = 0

  const state: DashboardState = {
    prefix: '',
    directory: { prefix: '', folders: [], files: [], cursor: null, truncated: false },
    visibleItems: [],
    selected: new Set<string>(),
    detail: null,
    shareTarget: null,
    moveTargets: [],
    deleteTargets: [],
    permanentDeleteId: null,
    importTasks: [],
    trashItems: [],
    viewMode: storedView === 'icon' ? 'icon' : 'table',
    sort: 'name',
    query: '',
  }

  const setStatus = (text: string, kind: '' | 'success' | 'warning' | 'error' = '', target: HTMLElement = elements.status): void => {
    target.textContent = text
    target.className = kind ? `status ${kind}` : 'status'
  }

  const allItems = (): ListedItem[] => [...state.directory.folders, ...state.directory.files]
  const findItem = (path: string): ListedItem | undefined => allItems().find((item) => item.path === path)
  const selectedItems = (): ListedItem[] => allItems().filter((item) => state.selected.has(item.path))

  const refreshDirectoryView = (): void => {
    state.visibleItems = filterAndSortItems(allItems(), state.query, state.sort)
    renderDirectory(elements, state.visibleItems, state.selected)
    elements.fileNavCount.textContent = String(allItems().length)
    updateSelectionView(elements, state.visibleItems, state.selected)
  }

  const directoryUrl = (prefix: string, cursor: string | null): string => {
    const params = new URLSearchParams({ prefix })
    if (cursor) params.set('cursor', cursor)
    return `/api/list?${params.toString()}`
  }

  const loadDirectory = async (prefix = state.prefix): Promise<void> => {
    const token = ++directoryToken
    state.prefix = prefix
    renderCrumbs(elements.crumbs, prefix)
    setStatus('正在加载目录...')
    try {
      // 第一页先渲染出来保住秒开手感，剩余页在后台补齐后再整体重绘一次。
      const first = await requestJson<DirectoryData>(directoryUrl(prefix, null))
      if (token !== directoryToken) return
      state.directory = first
      state.selected.clear()
      refreshDirectoryView()

      const result = await collectPages<DirectoryData>({
        first,
        fetchNext: (cursor) => requestJson<DirectoryData>(directoryUrl(prefix, cursor)),
        merge: (accumulated, next) => ({
          ...next,
          folders: [...accumulated.folders, ...next.folders],
          files: [...accumulated.files, ...next.files],
        }),
        isStale: () => token !== directoryToken,
        onProgress: (accumulated) => setStatus(`正在加载目录...已载入 ${accumulated.folders.length + accumulated.files.length} 项`),
      })
      if (result.stale) return

      if (result.pagesLoaded > 1) {
        state.directory = result.value
        refreshDirectoryView()
      }
      setStatus(
        result.capped ? `目录内容较多，已载入前 ${allItems().length} 项；进入子目录可查看其余内容` : '',
        result.capped ? 'warning' : ''
      )
    } catch (error) {
      if (token !== directoryToken) return
      setStatus(getErrorMessage(error, '目录加载失败'), 'error')
    }
  }

  const setViewMode = (mode: ViewMode): void => {
    state.viewMode = mode
    localStorage.setItem(viewStorageKey, mode)
    elements.tableView.classList.toggle('hidden', mode !== 'table')
    elements.iconView.classList.toggle('hidden', mode !== 'icon')
    elements.tableViewButton.classList.toggle('active', mode === 'table')
    elements.iconViewButton.classList.toggle('active', mode === 'icon')
    elements.tableViewButton.setAttribute('aria-pressed', String(mode === 'table'))
    elements.iconViewButton.setAttribute('aria-pressed', String(mode === 'icon'))
  }

  const closeDetail = (): void => {
    state.detail = null
    elements.detailPanel.classList.add('hidden')
    elements.contentGrid.classList.remove('with-detail')
  }

  const showDetail = async (path: string): Promise<void> => {
    try {
      const detail = await requestJson<ObjectDetail>(`/api/object?path=${encodeURIComponent(path)}`)
      state.detail = detail
      renderDetail(elements, detail)
    } catch (error) {
      setStatus(getErrorMessage(error, '加载详情失败'), 'error')
    }
  }

  const fileUrl = (path: string, download: boolean): string => `/api/file?path=${encodeURIComponent(path)}${download ? '&download=1' : ''}`

  const openPlayer = (path: string): void => {
    const name = baseName(path)
    const mediaType = getMediaType(name)
    if (!mediaType) {
      window.open(fileUrl(path, false), '_blank', 'noopener')
      return
    }
    const url = fileUrl(path, false)
    elements.playerTitle.textContent = name
    elements.playerContainer.innerHTML = mediaType === 'video'
      ? `<video controls src="${url}"></video>`
      : `<div class="audio-player">${iconMarkup('file-audio')}<audio controls src="${url}"></audio></div>`
    elements.playerDownload.href = fileUrl(path, true)
    elements.playerDownload.download = name
    elements.playerDialog.showModal()
    renderIcons(elements.playerDialog)
  }

  const openMoveDialog = (targets: ShareTarget[]): void => {
    if (!targets.length) return
    state.moveTargets = targets
    if (targets.length === 1) {
      elements.moveSource.textContent = `当前路径：${targets[0].path}`
      elements.moveTarget.value = targets[0].path
    } else {
      elements.moveSource.textContent = `将 ${targets.length} 个项目移动到目标目录`
      elements.moveTarget.value = state.prefix
    }
    elements.moveDialog.showModal()
    elements.moveTarget.focus()
    elements.moveTarget.select()
  }

  const submitMove = async (): Promise<void> => {
    const targets = [...state.moveTargets]
    if (!targets.length) return
    const rawTarget = elements.moveTarget.value
    const batch = targets.length > 1
    const batchDirectory = batch ? ensureFolderPath(rawTarget) : ''
    let moved = 0
    let updatedShares = 0

    for (const target of targets) {
      const targetPath = batch
        ? `${batchDirectory}${baseName(target.path)}${target.kind === 'folder' ? '/' : ''}`
        : target.kind === 'folder' ? ensureFolderPath(rawTarget) : normalizeInputPath(rawTarget)
      if (!targetPath) continue
      const result = await requestJson<{ moved: number; updatedShares: number }>('/api/move', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...target, targetPath }),
      })
      moved += result.moved
      updatedShares += result.updatedShares
    }

    elements.moveDialog.close()
    closeDetail()
    setStatus(`已移动 ${moved} 个对象，更新 ${updatedShares} 个分享`, 'success')
    const movedFolder = targets.find((target) => target.kind === 'folder' && state.prefix.startsWith(target.path))
    await loadDirectory(movedFolder && targets.length === 1 ? parentDirectory(elements.moveTarget.value) : state.prefix)
  }

  const openDeleteDialog = (targets: ShareTarget[]): void => {
    if (!targets.length) return
    state.deleteTargets = targets
    elements.deleteMessage.textContent = targets.length === 1 ? `确定将“${targets[0].path}”移入回收站吗？` : `确定将选中的 ${targets.length} 个项目移入回收站吗？`
    elements.deleteDialog.showModal()
  }

  const submitDelete = async (): Promise<void> => {
    const targets = [...state.deleteTargets]
    let deleted = 0
    let revokedShares = 0
    for (const target of targets) {
      const result = await requestJson<{ deleted: number; revokedShares: number }>(`/api/object?path=${encodeURIComponent(target.path)}`, { method: 'DELETE' })
      deleted += result.deleted
      revokedShares += result.revokedShares
    }
    elements.deleteDialog.close()
    closeDetail()
    setStatus(`已将 ${deleted} 个对象移入回收站，撤销 ${revokedShares} 个分享`, 'success')
    await Promise.all([loadDirectory(state.prefix), loadTrash(true)])
  }

  const openShareDialog = (target: ShareTarget): void => {
    state.shareTarget = target
    elements.shareTarget.textContent = `目标：${target.path}`
    elements.shareLink.value = ''
    elements.shareDialog.showModal()
    void loadShares()
  }

  const loadShares = async (): Promise<void> => {
    if (!state.shareTarget) return
    elements.shareList.innerHTML = '<div class="empty-state"><strong>正在加载已有分享...</strong></div>'
    try {
      const { kind, path } = state.shareTarget
      const data = await requestJson<{ shares: ShareItem[] }>(`/api/shares?kind=${kind}&path=${encodeURIComponent(path)}`)
      renderShares(elements.shareList, data.shares)
    } catch (error) {
      elements.shareList.innerHTML = `<div class="empty-state"><strong>${escapeHtml(getErrorMessage(error, '加载分享失败'))}</strong></div>`
    }
  }

  const createShare = async (): Promise<void> => {
    if (!state.shareTarget) return
    const result = await requestJson<{ url: string }>('/api/share', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...state.shareTarget, expiresInDays: Number(elements.shareExpiry.value) }),
    })
    elements.shareLink.value = result.url
    setStatus('分享链接已生成', 'success')
    await loadShares()
  }

  const revokeShare = async (code: string): Promise<void> => {
    await requestJson(`/api/share?code=${encodeURIComponent(code)}`, { method: 'DELETE' })
    setStatus('分享已撤销', 'success')
    await loadShares()
  }

  const uploader = createUploader({
    onSnapshot: (snapshot) => renderUploadActivity(elements, snapshot)
  })

  const upload = async (files: File[]): Promise<void> => {
    if (!files.length) return
    if (uploader.isRunning()) {
      setStatus('已有上传任务在进行，请等它结束或先取消', 'warning')
      return
    }

    const items = files.map((file) => ({
      file,
      // 选文件夹时 webkitRelativePath 带相对目录，要保留层级；拖放或选单个文件时只有文件名。
      path: `${state.prefix}${normalizeInputPath(file.webkitRelativePath || file.name)}`
    }))

    elements.uploadActivity.classList.remove('hidden')
    elements.cancelUpload.disabled = false
    setStatus(`正在上传 ${files.length} 个文件...`)

    const snapshot = await uploader.start(items)
    elements.cancelUpload.disabled = true

    if (snapshot.canceled) setStatus(`上传已取消，已完成 ${snapshot.done} 个文件`, 'warning')
    else if (snapshot.failed) setStatus(`上传结束：成功 ${snapshot.done} 个，失败 ${snapshot.failed} 个`, 'error')
    else setStatus(`上传完成：${snapshot.done} 个文件`, 'success')

    // 只要有文件落地就刷新目录，取消和部分失败同样需要看到已经传上去的部分。
    if (snapshot.done > 0) await loadDirectory(state.prefix)
  }

  const loadImportTasks = async (silent = false): Promise<void> => {
    if (!silent) setStatus('正在加载导入任务...', '', elements.importStatus)
    try {
      const data = await requestJson<{ tasks: ImportTask[] }>('/api/import-tasks?limit=50')
      state.importTasks = data.tasks
      elements.importNavCount.textContent = String(data.tasks.filter((task) => task.status === 'queued' || task.status === 'running').length)
      renderImportTasks(elements.importTasks, data.tasks)
      setStatus('', '', elements.importStatus)
    } catch (error) {
      setStatus(getErrorMessage(error, '加载导入任务失败'), 'error', elements.importStatus)
    }
  }

  const loadTrash = async (silent = false): Promise<void> => {
    if (!silent) setStatus('正在加载回收站...', '', elements.trashStatus)
    try {
      const data = await requestJson<{ items: TrashItem[] }>('/api/trash?limit=100')
      state.trashItems = data.items
      elements.trashNavCount.textContent = String(data.items.length)
      renderTrashItems(elements.trashList, data.items)
      setStatus('', '', elements.trashStatus)
    } catch (error) {
      setStatus(getErrorMessage(error, '加载回收站失败'), 'error', elements.trashStatus)
    }
  }

  const restoreTrash = async (itemId: string): Promise<void> => {
    await requestJson('/api/trash/restore', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ itemId }) })
    setStatus('项目已恢复', 'success', elements.trashStatus)
    await Promise.all([loadTrash(true), loadDirectory(state.prefix)])
  }

  const openPermanentDelete = (itemId: string): void => {
    const item = state.trashItems.find((candidate) => candidate.id === itemId)
    if (!item) return
    state.permanentDeleteId = itemId
    elements.permanentDeleteMessage.textContent = `确定彻底删除“${item.originalPath}”吗？`
    elements.permanentDeleteDialog.showModal()
  }

  const submitPermanentDelete = async (): Promise<void> => {
    if (!state.permanentDeleteId) return
    await requestJson(`/api/trash?itemId=${encodeURIComponent(state.permanentDeleteId)}`, { method: 'DELETE' })
    elements.permanentDeleteDialog.close()
    setStatus('项目已彻底删除', 'success', elements.trashStatus)
    await loadTrash(true)
  }

  const switchPanel = (targetId: string): void => {
    for (const panel of document.querySelectorAll<HTMLElement>('.app-panel')) panel.classList.toggle('hidden', panel.id !== targetId)
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-panel-target]')) button.classList.toggle('active', button.dataset.panelTarget === targetId)
    if (targetId === 'importsPanel') void loadImportTasks()
    if (targetId === 'trashPanel') void loadTrash()
  }

  const handleItemAction = (action: string, item: ListedItem): void => {
    if (action === 'enter' && item.kind === 'folder') void loadDirectory(item.path)
    else if (action === 'play' && item.kind === 'file') openPlayer(item.path)
    else if (action === 'detail') void showDetail(item.path)
    else if (action === 'move') openMoveDialog([item])
    else if (action === 'share') openShareDialog(item)
    else if (action === 'delete') openDeleteDialog([item])
  }

  document.addEventListener('click', (event) => {
    closeParentDialog(event.target)
    const panelButton = closestElement(event.target, '[data-panel-target]')
    if (panelButton?.dataset.panelTarget) switchPanel(panelButton.dataset.panelTarget)
  })

  elements.crumbs.addEventListener('click', (event) => {
    const button = closestElement(event.target, '[data-prefix]')
    if (button?.dataset.prefix != null) void loadDirectory(button.dataset.prefix)
  })

  const handleItemContainerClick = (event: MouseEvent): void => {
    const target = closestElement(event.target, '[data-path]')
    if (!target?.dataset.path) return
    const item = findItem(target.dataset.path)
    if (!item) return
    const action = closestElement(event.target, '[data-action]')?.dataset.action
    if (action) {
      closestElement(event.target, 'details')?.removeAttribute('open')
      handleItemAction(action, item)
      return
    }
    if (closestElement(event.target, 'input, summary, .menu-popover')) return
    if (item.kind === 'folder') void loadDirectory(item.path)
    else void showDetail(item.path)
  }
  elements.rows.addEventListener('click', handleItemContainerClick)
  elements.iconView.addEventListener('click', handleItemContainerClick)

  const handleSelectionChange = (event: Event): void => {
    const checkbox = event.target instanceof HTMLInputElement ? event.target.closest<HTMLInputElement>('[data-select-path]') : null
    if (!checkbox?.dataset.selectPath) return
    if (checkbox.checked) state.selected.add(checkbox.dataset.selectPath)
    else state.selected.delete(checkbox.dataset.selectPath)
    refreshDirectoryView()
  }
  elements.rows.addEventListener('change', handleSelectionChange)
  elements.iconView.addEventListener('change', handleSelectionChange)

  elements.selectAll.addEventListener('change', () => {
    for (const item of state.visibleItems) {
      if (elements.selectAll.checked) state.selected.add(item.path)
      else state.selected.delete(item.path)
    }
    refreshDirectoryView()
  })

  elements.searchInput.addEventListener('input', () => {
    state.query = elements.searchInput.value
    state.selected.clear()
    refreshDirectoryView()
  })
  elements.sortSelect.addEventListener('change', () => {
    state.sort = elements.sortSelect.value as SortMode
    refreshDirectoryView()
  })

  elements.tableViewButton.addEventListener('click', () => setViewMode('table'))
  elements.iconViewButton.addEventListener('click', () => setViewMode('icon'))
  elements.refresh.addEventListener('click', () => void loadDirectory(state.prefix))
  elements.closeDetail.addEventListener('click', closeDetail)
  elements.hideUploadActivity.addEventListener('click', () => elements.uploadActivity.classList.add('hidden'))
  elements.cancelUpload.addEventListener('click', () => {
    uploader.cancel()
    elements.cancelUpload.disabled = true
  })

  elements.newFolderButton.addEventListener('click', () => {
    elements.folderLocation.textContent = `将在 /${state.prefix} 中创建`
    elements.folderName.value = ''
    elements.folderDialog.showModal()
    elements.folderName.focus()
  })
  elements.folderForm.addEventListener('submit', (event) => {
    event.preventDefault()
    const path = ensureFolderPath(`${state.prefix}${elements.folderName.value}`)
    void requestJson<{ path: string }>('/api/folder', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path }) })
      .then(async (result) => { elements.folderDialog.close(); setStatus(`文件夹已创建：${result.path}`, 'success'); await loadDirectory(state.prefix) })
      .catch((error: unknown) => setStatus(getErrorMessage(error, '创建文件夹失败'), 'error'))
  })

  const openImportDialog = (): void => {
    elements.importLocation.textContent = `目标目录：/${state.prefix}`
    elements.importForm.reset()
    elements.importDialog.showModal()
    elements.importUrl.focus()
  }
  elements.importUrlButton.addEventListener('click', openImportDialog)
  elements.newImportFromPanel.addEventListener('click', openImportDialog)
  elements.importForm.addEventListener('submit', (event) => {
    event.preventDefault()
    void requestJson<{ id: string }>('/api/import-url', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: elements.importUrl.value, directory: state.prefix, fileName: elements.importFileName.value, overwrite: elements.importOverwrite.checked }) })
      .then(async (result) => { elements.importDialog.close(); setStatus(`URL 导入任务已创建：${result.id}`, 'success'); await loadImportTasks(true) })
      .catch((error: unknown) => setStatus(getErrorMessage(error, 'URL 导入失败'), 'error'))
  })

  elements.moveForm.addEventListener('submit', (event) => { event.preventDefault(); void submitMove().catch((error: unknown) => setStatus(getErrorMessage(error, '移动失败'), 'error')) })
  elements.deleteForm.addEventListener('submit', (event) => { event.preventDefault(); void submitDelete().catch((error: unknown) => setStatus(getErrorMessage(error, '删除失败'), 'error')) })
  elements.permanentDeleteForm.addEventListener('submit', (event) => { event.preventDefault(); void submitPermanentDelete().catch((error: unknown) => setStatus(getErrorMessage(error, '彻底删除失败'), 'error', elements.trashStatus)) })

  elements.downloadSelected.addEventListener('click', () => selectedItems().filter((item) => item.kind === 'file').forEach((item) => window.open(fileUrl(item.path, true), '_blank', 'noopener')))
  elements.moveSelected.addEventListener('click', () => openMoveDialog(selectedItems()))
  elements.shareSelected.addEventListener('click', () => { const item = selectedItems()[0]; if (item) openShareDialog(item) })
  elements.deleteSelected.addEventListener('click', () => openDeleteDialog(selectedItems()))

  elements.openFile.addEventListener('click', () => { if (state.detail?.kind === 'file') openPlayer(state.detail.path) })
  elements.downloadFile.addEventListener('click', () => { if (state.detail?.kind === 'file') window.open(fileUrl(state.detail.path, true), '_blank', 'noopener') })
  elements.moveFromDetail.addEventListener('click', () => { if (state.detail) openMoveDialog([state.detail]) })
  elements.shareFromDetail.addEventListener('click', () => { if (state.detail) openShareDialog(state.detail) })
  elements.deleteFromDetail.addEventListener('click', () => { if (state.detail) openDeleteDialog([state.detail]) })

  elements.createShare.addEventListener('click', () => void createShare().catch((error: unknown) => setStatus(getErrorMessage(error, '生成分享失败'), 'error')))
  elements.refreshShares.addEventListener('click', () => void loadShares())
  elements.copyShare.addEventListener('click', () => {
    if (!elements.shareLink.value) return
    void navigator.clipboard.writeText(elements.shareLink.value).then(() => setStatus('分享链接已复制', 'success')).catch(() => setStatus('复制失败，请手动复制', 'error'))
  })
  elements.shareList.addEventListener('click', (event) => {
    const revoke = closestElement(event.target, '[data-revoke]')?.dataset.revoke
    if (revoke) void revokeShare(revoke).catch((error: unknown) => setStatus(getErrorMessage(error, '撤销分享失败'), 'error'))
    const copyUrl = closestElement(event.target, '[data-copy-url]')?.dataset.copyUrl
    if (copyUrl) void navigator.clipboard.writeText(copyUrl)
      .then(() => setStatus('分享链接已复制', 'success'))
      .catch(() => setStatus('复制失败，请手动复制', 'error'))
  })

  elements.refreshImports.addEventListener('click', () => void loadImportTasks())
  elements.refreshTrash.addEventListener('click', () => void loadTrash())
  elements.importTasks.addEventListener('click', (event) => {
    const taskId = closestElement(event.target, '[data-task-id]')?.dataset.taskId
    const task = state.importTasks.find((candidate) => candidate.id === taskId)
    if (!task) return
    renderImportTaskDetail(elements.importTaskBody, task)
    elements.importTaskDialog.showModal()
  })
  elements.trashList.addEventListener('click', (event) => {
    const restoreId = closestElement(event.target, '[data-trash-restore]')?.dataset.trashRestore
    if (restoreId) void restoreTrash(restoreId).catch((error: unknown) => setStatus(getErrorMessage(error, '恢复失败'), 'error', elements.trashStatus))
    const deleteId = closestElement(event.target, '[data-trash-delete]')?.dataset.trashDelete
    if (deleteId) openPermanentDelete(deleteId)
  })

  elements.pickFiles.addEventListener('change', () => { const files = Array.from(elements.pickFiles.files || []); void upload(files); elements.pickFiles.value = '' })
  elements.pickFolder.addEventListener('change', () => { const files = Array.from(elements.pickFolder.files || []); void upload(files); elements.pickFolder.value = '' })
  for (const eventName of ['dragenter', 'dragover']) elements.dropzone.addEventListener(eventName, (event) => { event.preventDefault(); elements.dropzone.classList.add('dragging') })
  for (const eventName of ['dragleave', 'drop']) elements.dropzone.addEventListener(eventName, (event) => { event.preventDefault(); elements.dropzone.classList.remove('dragging') })
  elements.dropzone.addEventListener('drop', (event) => {
    const files = Array.from(event.dataTransfer?.items || []).filter((item) => item.kind === 'file').map((item) => item.getAsFile()).filter((file): file is File => file !== null)
    void upload(files)
  })

  const closeDialog = (dialog: HTMLDialogElement): void => dialog.close()
  elements.closeFolderDialog.addEventListener('click', () => closeDialog(elements.folderDialog))
  elements.closeImportDialog.addEventListener('click', () => closeDialog(elements.importDialog))
  elements.closeMoveDialog.addEventListener('click', () => closeDialog(elements.moveDialog))
  elements.closeDeleteDialog.addEventListener('click', () => closeDialog(elements.deleteDialog))
  elements.closeShareDialog.addEventListener('click', () => closeDialog(elements.shareDialog))
  elements.closeImportTask.addEventListener('click', () => closeDialog(elements.importTaskDialog))
  elements.closePermanentDelete.addEventListener('click', () => closeDialog(elements.permanentDeleteDialog))
  elements.closePlayer.addEventListener('click', () => { elements.playerContainer.replaceChildren(); closeDialog(elements.playerDialog) })

  renderIcons()
  setViewMode(state.viewMode)
  window.setInterval(() => void loadImportTasks(true), 15_000)

  void Promise.all([
    requestJson<{ email: string }>('/api/session').then((session) => { elements.who.textContent = session.email }),
    loadDirectory(''),
    loadImportTasks(true),
    loadTrash(true),
  ]).catch((error: unknown) => setStatus(getErrorMessage(error, '初始化失败'), 'error'))

}
