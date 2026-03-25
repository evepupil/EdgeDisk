// @ts-nocheck
export {}

const root = document.getElementById('share-page')
if (!root) throw new Error('share page root missing')

const themeStorageKey = 'edgedisk:theme'

const state = {
  code: root.dataset.shareCode || '',
  sub: '',
  selected: new Set(),
  mode: 'folder',
  theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

const e = {
  crumbs: document.getElementById('crumbs'),
  themeToggle: document.getElementById('themeToggle'),
  refresh: document.getElementById('refresh'),
  downloadSelected: document.getElementById('downloadSelected'),
  status: document.getElementById('status'),
  summary: document.getElementById('summary'),
  rows: document.getElementById('rows'),
  playerDialog: document.getElementById('playerDialog'),
  playerTitle: document.getElementById('playerTitle'),
  playerContainer: document.getElementById('playerContainer'),
  playerDownload: document.getElementById('playerDownload'),
  closePlayer: document.getElementById('closePlayer')
}

const esc = (v) => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const bytes = (n) => {
  if (n == null) return '-'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = Number(n)
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return value.toFixed(value >= 100 || index === 0 ? 0 : 1) + ' ' + units[index]
}
const time = (v) => (v ? new Date(v).toLocaleString('zh-CN', { hour12: false }) : '-')
const trimSlash = (value) => {
  const input = String(value || '')
  return input.endsWith('/') ? input.slice(0, -1) : input
}
const setStatus = (text, kind = '') => {
  e.status.textContent = text
  e.status.className = kind ? 'status ' + kind : 'status'
}

const renderThemeToggle = () => {
  if (!e.themeToggle) return
  const isLight = state.theme === 'light'
  e.themeToggle.textContent = isLight ? '\uD83C\uDF19 \u6697\u8272' : '\u2600\uFE0F \u4EAE\u8272'
  e.themeToggle.title = isLight ? '\u5207\u6362\u5230\u6697\u8272\u4E3B\u9898' : '\u5207\u6362\u5230\u4EAE\u8272\u4E3B\u9898'
}

const applyTheme = (nextTheme, persist = false) => {
  state.theme = nextTheme === 'light' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', state.theme)
  if (persist) localStorage.setItem(themeStorageKey, state.theme)
  renderThemeToggle()
}

const toggleTheme = () => {
  applyTheme(state.theme === 'light' ? 'dark' : 'light', true)
}
const api = async (url) => {
  const response = await fetch(url)
  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json() : await response.text()
  if (!response.ok) throw new Error(typeof data === 'string' ? data : (data.error || response.statusText))
  return data
}
const sharedUrl = (path, download) => path
  ? ('/s/' + state.code + '/file?path=' + encodeURIComponent(path) + (download ? '&download=1' : ''))
  : ('/s/' + state.code + '/file' + (download ? '?download=1' : ''))

const VIDEO_EXTS = new Set(['mp4', 'webm', 'ogv', 'mov', 'mkv', 'avi'])
const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'opus'])

function getMediaType(name) {
  const ext = (name || '').split('.').pop().toLowerCase()
  if (VIDEO_EXTS.has(ext)) return 'video'
  if (AUDIO_EXTS.has(ext)) return 'audio'
  return null
}

function openPlayer(subpath, name) {
  const mediaType = getMediaType(name)
  if (!mediaType) return
  const url = sharedUrl(subpath, false)
  e.playerTitle.textContent = (mediaType === 'video' ? '🎬 ' : '🎵 ') + name
  e.playerContainer.innerHTML = ''
  if (mediaType === 'video') {
    e.playerContainer.innerHTML = '<video controls src="' + esc(url) + '" style="width:100%;max-height:70vh"></video>'
  } else {
    e.playerContainer.innerHTML = '<div class="audio-player"><div class="audio-icon">🎵</div><audio controls src="' + esc(url) + '" style="width:100%"></audio></div>'
  }
  e.playerDownload.href = sharedUrl(subpath, true)
  e.playerDownload.download = name
  e.playerDialog.showModal()
}

e.closePlayer.onclick = () => {
  e.playerContainer.innerHTML = ''
  e.playerDialog.close()
}

function updatePick() {
  e.downloadSelected.disabled = state.mode !== 'folder' || state.selected.size === 0
}

function crumbsRender() {
  e.crumbs.innerHTML = ''
  const rootButton = document.createElement('button')
  rootButton.textContent = '分享根目录'
  rootButton.onclick = () => load('')
  e.crumbs.appendChild(rootButton)

  const plain = trimSlash(state.sub)
  const parts = plain ? plain.split('/') : []
  let current = ''
  for (const part of parts) {
    const sep = document.createElement('span')
    sep.textContent = '/'
    e.crumbs.appendChild(sep)
    current += part + '/'
    const btn = document.createElement('button')
    btn.textContent = part
    const target = current
    btn.onclick = () => load(target)
    e.crumbs.appendChild(btn)
  }
}

function summaryRender(data) {
  const list = [
    ['类型', data.kind === 'file' ? '文件分享' : '文件夹分享'],
    ['原始路径', data.rootPath],
    ['当前目录', data.currentPrefix || data.rootPath],
    ['创建时间', time(data.createdAt)],
    ['过期时间', data.expiresAt ? time(data.expiresAt) : '永久有效'],
    ['项目数量', String((data.folders?.length || 0) + (data.files?.length || 0) || 1)]
  ]
  e.summary.innerHTML = list
    .map((item) => '<div class="info"><div class="muted">' + esc(item[0]) + '</div><div class="mono">' + esc(String(item[1])) + '</div></div>')
    .join('')
}

function rowsRender(data) {
  state.selected.clear()
  updatePick()

  if (data.kind === 'file') {
    state.mode = 'file'
    const mediaType = getMediaType(data.file.name)
    const icon = mediaType === 'video' ? '🎬' : mediaType === 'audio' ? '🎵' : '📄'
    const playBtn = mediaType ? '<button class="btn" type="button" data-play="">播放</button>' : ''
    e.rows.innerHTML =
      '<tr><td></td><td class="name"><span class="name-text">' + icon + ' ' + esc(data.file.name) + '</span></td><td>文件</td><td>' +
      bytes(data.file.size) + '</td><td>' + esc(time(data.file.uploaded)) + '</td><td><div class="actions">' + playBtn +
      '<a class="btn" href="' + sharedUrl('', false) + '" target="_blank" rel="noopener">在线打开</a>' +
      '<a class="btn primary" href="' + sharedUrl('', true) + '">下载</a></div></td></tr>'
    if (mediaType) {
      const btn = e.rows.querySelector('[data-play]')
      if (btn) btn.onclick = () => openPlayer('', data.file.name)
    }
    return
  }

  state.mode = 'folder'
  if (!data.folders.length && !data.files.length) {
    e.rows.innerHTML = '<tr><td colspan="6" class="empty">这个分享目录当前没有可展示的文件。</td></tr>'
    return
  }

  const html = []
  for (const folder of data.folders) {
    html.push(
      '<tr class="row" data-folder="' + esc(folder.subpath) + '"><td></td><td class="name"><span class="name-text">📁 ' + esc(folder.name) +
      '</span></td><td>文件夹</td><td>-</td><td>-</td><td class="muted">点击进入</td></tr>'
    )
  }

  for (const file of data.files) {
    const mediaType = getMediaType(file.name)
    const icon = mediaType === 'video' ? '🎬' : mediaType === 'audio' ? '🎵' : '📄'
    const playBtn = mediaType ? '<button class="btn" type="button" data-play="' + esc(file.subpath) + '">播放</button>' : ''
    html.push(
      '<tr data-file="' + esc(file.subpath) + '"><td><input type="checkbox" data-pick="' + esc(file.subpath) +
      '" /></td><td class="name"><span class="name-text">' + icon + ' ' + esc(file.name) + '</span></td><td>文件</td><td>' +
      bytes(file.size) + '</td><td>' + esc(time(file.uploaded)) + '</td><td><div class="actions">' + playBtn +
      '<a class="btn" href="' + sharedUrl(file.subpath, false) + '" target="_blank" rel="noopener">在线打开</a>' +
      '<a class="btn primary" href="' + sharedUrl(file.subpath, true) + '">下载</a></div></td></tr>'
    )
  }

  e.rows.innerHTML = html.join('')
  for (const row of e.rows.querySelectorAll('tr[data-folder]')) {
    row.onclick = () => load(row.dataset.folder)
  }
  for (const box of e.rows.querySelectorAll('input[data-pick]')) {
    box.addEventListener('change', () => {
      const value = box.dataset.pick
      if (!value) return
      if (box.checked) state.selected.add(value)
      else state.selected.delete(value)
      updatePick()
    })
  }
  for (const btn of e.rows.querySelectorAll('[data-play]')) {
    btn.addEventListener('click', (event) => {
      event.stopPropagation()
      const name = btn.closest('tr')?.querySelector('.name')?.textContent?.trim() || ''
      openPlayer(btn.dataset.play, name)
    })
  }
}

async function load(sub = state.sub) {
  state.sub = sub
  crumbsRender()
  setStatus('正在加载分享内容…')
  try {
    const data = await api('/share-api/' + state.code + '?sub=' + encodeURIComponent(sub))
    summaryRender(data)
    rowsRender(data)
    setStatus('分享内容已更新', 'success')
  } catch (error) {
    setStatus(error.message || '分享加载失败', 'error')
  }
}

if (e.themeToggle) e.themeToggle.onclick = () => toggleTheme()

applyTheme(state.theme, false)

e.refresh.onclick = () => load(state.sub)
e.downloadSelected.onclick = () => {
  for (const path of state.selected) {
    window.open(sharedUrl(path, true), '_blank', 'noopener')
  }
}

load('')