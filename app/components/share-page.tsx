import { Icon } from './ui/icon'

type SharePageProps = {
  appName: string
  shareCode: string
}

export function SharePage({ appName, shareCode }: SharePageProps) {
  return (
    <div class="share-page" id="share-page" data-share-code={shareCode}>
      <header class="share-header">
        <a class="brand" href={`/s/${shareCode}`} aria-label={`${appName} 分享首页`}>
          <span class="brand-mark"><Icon name="hard-drive" /></span><strong>{appName}</strong>
        </a>
        <div class="share-header-actions">
          <span class="share-badge"><Icon name="shield-check" />公开分享</span>
          <button class="icon-btn" id="themeToggle" type="button" aria-label="切换主题" data-tooltip="切换主题"><Icon name="moon" /></button>
        </div>
      </header>

      <main class="share-main">
        <div class="share-heading">
          <div><h1 id="shareTitle">分享内容</h1><div class="share-meta"><span id="shareMetaCount">正在读取项目</span><span id="shareMetaSize" /><span id="shareExpiryView" /></div></div>
        </div>

        <nav class="crumbs" id="crumbs" aria-label="分享位置" />

        <div class="share-toolbar">
          <span class="muted" id="shareSelectionCopy">请选择需要下载的文件</span>
          <div class="toolbar-group">
            <button class="btn" id="refresh" type="button"><Icon name="refresh-cw" />刷新</button>
            <button class="btn primary" id="downloadSelected" type="button" disabled><Icon name="download" />下载选中</button>
          </div>
        </div>

        <div class="status" id="status" aria-live="polite" />
        <div class="table-wrap">
          <table class="file-table share-table">
            <thead><tr><th class="check-cell"><span class="sr-only">选择</span></th><th>名称</th><th class="size-cell">大小</th><th class="time-cell">更新时间</th><th class="share-action-cell"><span class="sr-only">操作</span></th></tr></thead>
            <tbody id="rows" />
          </table>
        </div>
      </main>

      <dialog id="playerDialog">
        <div class="dialog-form player-dialog">
          <div class="dialog-head"><h2 id="playerTitle">媒体预览</h2><button class="icon-btn" id="closePlayer" type="button" aria-label="关闭"><Icon name="x" /></button></div>
          <div class="player-container" id="playerContainer" />
          <a class="btn primary" id="playerDownload" download><Icon name="download" />下载文件</a>
        </div>
      </dialog>
    </div>
  )
}
