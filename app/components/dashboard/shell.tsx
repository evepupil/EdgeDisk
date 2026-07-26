import { Icon } from '../ui/icon'

type DashboardShellProps = {
  appName: string
}

export function DashboardShell({ appName }: DashboardShellProps) {
  return (
    <div class="app-frame">
      <header class="topbar">
        <a class="brand" href="/app" aria-label={`${appName} 首页`}>
          <span class="brand-mark"><Icon name="hard-drive" /></span>
          <strong>{appName}</strong>
        </a>
        <label class="search-field" for="searchInput">
          <Icon name="search" />
          <span class="sr-only">搜索当前目录</span>
          <input id="searchInput" type="search" placeholder="搜索当前目录" autocomplete="off" />
        </label>
        <div class="account">
          <div class="account-copy"><strong id="who">正在验证身份...</strong><span>管理员</span></div>
          <button class="btn ghost icon-only" type="button" aria-label="账户菜单" data-tooltip="账户菜单"><Icon name="circle-user-round" /></button>
        </div>
      </header>

      <div class="workspace">
        <aside class="sidebar" aria-label="主导航">
          <button class="nav-button active" id="filesNav" type="button" data-panel-target="filesPanel"><Icon name="files" /><span>全部文件</span><span class="nav-count" id="fileNavCount">0</span></button>
          <button class="nav-button" id="importsNav" type="button" data-panel-target="importsPanel"><Icon name="cloud-download" /><span>导入任务</span><span class="nav-count" id="importNavCount">0</span></button>
          <button class="nav-button" id="trashNav" type="button" data-panel-target="trashPanel"><Icon name="trash-2" /><span>回收站</span><span class="nav-count" id="trashNavCount">0</span></button>
          <div class="sidebar-spacer" />
          <div class="storage-block"><span>存储空间</span><div class="storage-track"><span /></div><small>Cloudflare R2</small></div>
        </aside>

        <main class="main-area">
          <FilePanel />
          <ImportsPanel />
          <TrashPanel />
        </main>
      </div>
    </div>
  )
}

function FilePanel() {
  return (
    <section class="app-panel" id="filesPanel">
      <div class="page-heading">
        <div><h1>全部文件</h1><nav class="crumbs" id="crumbs" aria-label="当前位置" /></div>
        <div class="heading-actions">
          <button class="btn" id="newFolderButton" type="button"><Icon name="folder-plus" />新建文件夹</button>
          <button class="btn" id="importUrlButton" type="button"><Icon name="link-2" />URL 导入</button>
          <label class="btn primary file-picker"><Icon name="upload" />上传<input id="pickFiles" type="file" multiple /></label>
          <label class="btn ghost icon-only file-picker" data-tooltip="上传文件夹"><Icon name="folder-up" /><span class="sr-only">上传文件夹</span><input id="pickFolder" type="file" multiple webkitdirectory="" directory="" /></label>
        </div>
      </div>

      <div class="file-toolbar">
        <div class="toolbar-group">
          <label class="compact-field" for="sortSelect"><span class="sr-only">排序方式</span><Icon name="arrow-down-up" /><select id="sortSelect"><option value="name">按名称</option><option value="updated">按更新时间</option><option value="size">按大小</option></select></label>
          <span class="muted" id="itemCount">0 个项目</span>
        </div>
        <div class="toolbar-group">
          <button class="icon-btn" id="refresh" type="button" aria-label="刷新目录" data-tooltip="刷新目录"><Icon name="refresh-cw" /></button>
          <div class="segmented" aria-label="视图模式"><button class="icon-btn active" id="tableViewButton" type="button" aria-label="列表视图" aria-pressed="true"><Icon name="list" /></button><button class="icon-btn" id="iconViewButton" type="button" aria-label="网格视图" aria-pressed="false"><Icon name="grid-2x2" /></button></div>
        </div>
      </div>

      <div class="selection-bar hidden" id="selectionBar">
        <strong><span id="selectionCount">0</span> 个项目已选择</strong>
        <div class="selection-actions"><button class="btn quiet" id="downloadSelected" type="button"><Icon name="download" />下载文件</button><button class="btn quiet" id="moveSelected" type="button"><Icon name="move" />移动</button><button class="btn quiet" id="shareSelected" type="button"><Icon name="share-2" />分享</button><button class="btn quiet" id="deleteSelected" type="button"><Icon name="trash-2" />移入回收站</button></div>
      </div>

      <div class="content-grid" id="contentGrid">
        <div class="file-surface" id="dropzone">
          <div class="drop-overlay" id="dropOverlay"><Icon name="upload-cloud" /><strong>松开后上传到当前目录</strong></div>
          <div class="status" id="status" aria-live="polite" />
          <div class="table-wrap" id="tableView"><table class="file-table compact-table"><thead><tr><th class="check-cell"><input id="selectAll" type="checkbox" aria-label="选择全部" /></th><th>名称</th><th class="size-cell">大小</th><th class="time-cell">更新时间</th><th class="menu-cell"><span class="sr-only">操作</span></th></tr></thead><tbody id="rows" /></table></div>
          <div class="file-grid hidden" id="iconView" />
        </div>
        <DetailPanel />
      </div>

      <div class="activity-bar hidden" id="uploadActivity" aria-live="polite">
        <div class="activity-head">
          <div class="activity-copy"><Icon name="upload-cloud" /><div><strong id="uploadTitle">正在上传</strong><span id="uploadMeta" /></div></div>
          <div class="activity-actions">
            <button class="btn quiet" id="cancelUpload" type="button"><Icon name="circle-x" />取消上传</button>
            <button class="btn ghost icon-only" id="hideUploadActivity" type="button" aria-label="收起上传状态"><Icon name="x" /></button>
          </div>
        </div>
        <div class="activity-progress">
          <div class="progress-track"><span id="uploadProgress" /></div>
          <span class="activity-percent" id="uploadPercent">0%</span>
        </div>
        <div class="upload-list" id="uploadList" />
      </div>
    </section>
  )
}

function DetailPanel() {
  return (
    <aside class="detail-panel hidden" id="detailPanel" aria-label="项目详情">
      <div class="detail-head"><div class="detail-title"><Icon name="info" /><h2>文件详情</h2></div></div>
      <div class="detail-body"><div class="detail-preview" id="detailPreview"><Icon name="file" /></div><strong class="detail-name" id="detailName">-</strong><dl class="detail-list" id="detailBody" />
      <div class="detail-actions"><button class="btn primary" id="openFile" type="button"><Icon name="play" />在线预览</button><button class="btn" id="downloadFile" type="button"><Icon name="download" />下载</button><button class="btn" id="shareFromDetail" type="button"><Icon name="share-2" />分享</button><button class="btn ghost" id="closeDetail" type="button"><Icon name="x" />关闭详情</button><button class="hidden" id="moveFromDetail" type="button" /><button class="hidden" id="deleteFromDetail" type="button" /></div></div>
    </aside>
  )
}

function ImportsPanel() {
  return <section class="app-panel hidden" id="importsPanel"><div class="page-heading"><div><h1>导入任务</h1><p>查看从 URL 导入的文件进度和结果。</p></div><div class="heading-actions"><button class="btn" id="refreshImports" type="button"><Icon name="refresh-cw" />刷新</button><button class="btn" id="clearFinishedImports" type="button"><Icon name="trash-2" />清空已结束</button><button class="btn primary" id="newImportFromPanel" type="button"><Icon name="plus" />新建导入</button></div></div><div class="status" id="importStatus" aria-live="polite" /><div class="data-list" id="importTasks"><div class="empty-state"><Icon name="cloud-download" /><strong>暂无导入任务</strong></div></div></section>
}

function TrashPanel() {
  return <section class="app-panel hidden" id="trashPanel"><div class="page-heading"><div><h1>回收站</h1><p>删除后的项目可以恢复；彻底删除无法撤销。</p></div><button class="btn" id="refreshTrash" type="button"><Icon name="refresh-cw" />刷新</button></div><div class="status" id="trashStatus" aria-live="polite" /><div class="data-list" id="trashList"><div class="empty-state"><Icon name="trash-2" /><strong>回收站为空</strong></div></div></section>
}
