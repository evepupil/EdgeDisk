type DashboardPageProps = {
  appName: string
}

export function DashboardPage(props: DashboardPageProps) {
  return (
    <div class="page" id="dashboard-page">
      <section class="hero">
        <div>
          <h1>{props.appName}</h1>
          <p>个人轻网盘：上传、浏览、查看详情、删除、移动/重命名、创建文件夹、短链分享与撤销。</p>
        </div>
        <div class="actions">
          <span class="badge" id="who">正在验证身份…</span>
          <button class="btn" id="themeToggle" type="button">{'\u5207\u6362\u4E3B\u9898'}</button>
          <button class="btn" id="refresh">刷新</button>
        </div>
      </section>

      <div class="grid">
        <section class="card">
          <div class="card-head">
            <div>
              <div class="muted">当前目录</div>
              <div class="crumbs" id="crumbs"></div>
            </div>
            <div class="toolbar">
              <button class="btn" id="newFolderButton">新建文件夹</button>
              <button class="btn" id="importUrlButton">URL 导入</button>
              <button class="btn" id="trashButton">{'\u56de\u6536\u7ad9'}</button>
              <button class="btn active" id="tableViewButton">列表视图</button>
              <button class="btn" id="iconViewButton">图标视图</button>
              <label class="pick primary">上传文件<input id="pickFiles" type="file" multiple /></label>
              <label class="pick">上传文件夹<input id="pickFolder" type="file" multiple webkitdirectory directory /></label>
            </div>
          </div>
          <div class="drop" id="dropzone">拖拽文件或文件夹到这里，自动上传到当前目录。</div>
          <div class="card-body">
            <div class="status" id="status"></div>
            <div class="table" id="tableView">
              <table>
                <thead>
                  <tr><th>名称</th><th>类型</th><th>大小</th><th>更新时间</th><th>MIME</th><th>操作</th></tr>
                </thead>
                <tbody id="rows"></tbody>
              </table>
            </div>
            <div class="cards hidden" id="iconView"></div>
          </div>
        </section>

        <aside class="card">
          <div class="card-head">
            <div>
              <div class="muted">概览</div>
              <h2 style="margin:6px 0 0;font-size:22px">R2 目录面板</h2>
            </div>
          </div>
          <div class="card-body stack">
            <div class="stats">
              <div class="stat"><div class="muted">文件夹</div><strong id="folderCount">0</strong></div>
              <div class="stat"><div class="muted">文件</div><strong id="fileCount">0</strong></div>
            </div>
            <div class="info"><div class="muted">当前路径</div><div class="mono" id="pathView">/</div></div>
            <div class="info">支持列表视图与图标视图切换。图标视图更像桌面文件管理器。</div>
            <div class="info">文件和文件夹都支持分享、删除、移动/重命名；文件夹还支持空目录创建。</div>
            <div class="info">
              <div class="toolbar" style="justify-content:space-between">
                <div>
                  <div class="muted">URL 导入任务</div>
                  <div style="margin-top:6px">队列异步导入到当前目录</div>
                </div>
                <button class="btn small" id="refreshImports">刷新</button>
              </div>
              <div class="task-list" id="importTasks"><div class="empty">暂无导入任务</div></div>
            </div>
          </div>
        </aside>
      </div>

      <dialog id="detailDialog">
        <div class="modal-head"><h2>对象信息</h2></div>
        <div class="modal-body">
          <div class="stack" id="detailBody"></div>
          <div class="actions">
            <button class="btn" id="openFile">在线打开</button>
            <button class="btn primary" id="downloadFile">下载</button>
            <button class="btn" id="moveFromDetail">移动/重命名</button>
            <button class="btn" id="shareFromDetail">分享</button>
            <button class="btn danger" id="deleteFromDetail">删除</button>
            <button class="btn" id="closeDetail">关闭</button>
          </div>
        </div>
      </dialog>

      <dialog id="shareDialog">
        <div class="modal-head"><h2>分享短链</h2></div>
        <div class="modal-body">
          <div class="info mono" id="shareTarget"></div>
          <div class="form-grid">
            <input class="input mono" id="shareLink" readonly />
            <select class="select" id="shareExpiry">
              <option value="0">永久有效</option>
              <option value="1">1 天后过期</option>
              <option value="7" selected>7 天后过期</option>
              <option value="30">30 天后过期</option>
            </select>
          </div>
          <div class="actions">
            <button class="btn primary" id="createShare">生成短链</button>
            <button class="btn" id="copyShare">复制</button>
            <button class="btn" id="refreshShares">刷新分享</button>
            <button class="btn" id="closeShare">关闭</button>
          </div>
          <div class="share-list" id="shareList"></div>
        </div>
      </dialog>

      <dialog id="playerDialog">
        <div class="modal-head"><h2 id="playerTitle">媒体播放</h2></div>
        <div class="modal-body">
          <div class="player-container" id="playerContainer"></div>
          <div class="actions">
            <a class="btn primary" id="playerDownload" download>下载</a>
            <button class="btn" id="closePlayer">关闭</button>
          </div>
        </div>
      </dialog>

      <dialog id="trashDialog">
        <div class="modal-head"><h2>{'\u56de\u6536\u7ad9'}</h2></div>
        <div class="modal-body">
          <div class="toolbar" style="justify-content:space-between;margin-bottom:12px">
            <div class="muted">{'\u5220\u9664\u540e\u7684\u6587\u4ef6\u4f1a\u5148\u4fdd\u5b58\u5728\u8fd9\u91cc\uff0c\u53ef\u6062\u590d\u6216\u5f7b\u5e95\u5220\u9664\u3002'}</div>
            <button class="btn small" id="refreshTrash">{'\u5237\u65b0'}</button>
          </div>
          <div class="task-list" id="trashList"><div class="empty">{'\u56de\u6536\u7ad9\u4e3a\u7a7a'}</div></div>
          <div class="actions">
            <button class="btn" id="closeTrash">{'\u5173\u95ed'}</button>
          </div>
        </div>
      </dialog>

      <dialog id="importTaskDialog">
        <div class="modal-head"><h2>导入任务详情</h2></div>
        <div class="modal-body">
          <div class="stack" id="importTaskBody"></div>
          <div class="actions">
            <button class="btn" id="closeImportTask">关闭</button>
          </div>
        </div>
      </dialog>
    </div>
  )
}
