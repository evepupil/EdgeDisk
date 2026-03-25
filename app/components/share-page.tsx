type SharePageProps = {
  appName: string
  shareCode: string
}

export function SharePage(props: SharePageProps) {
  return (
    <div class="page" id="share-page" data-share-code={props.shareCode}>
      <section class="hero">
        <div>
          <h1>{props.appName} 分享</h1>
          <p>浏览公开分享的文件或文件夹，并按需下载。</p>
        </div>
        <div class="actions"><button class="btn" id="themeToggle" type="button">{'\u5207\u6362\u4E3B\u9898'}</button><a class="btn" href="/app">{'\u8FDB\u5165\u540E\u53F0'}</a></div>
      </section>
      <section class="card" style="margin-top:16px">
        <div class="card-head">
          <div>
            <div class="muted">分享编号</div>
            <div class="mono">{props.shareCode}</div>
            <div class="crumbs" id="crumbs"></div>
          </div>
          <div class="actions">
            <button class="btn" id="refresh">刷新</button>
            <button class="btn primary" id="downloadSelected" disabled>下载选中</button>
          </div>
        </div>
        <div class="card-body">
          <div class="status" id="status"></div>
          <div class="stack" id="summary"></div>
          <div class="table">
            <table>
              <thead>
                <tr><th></th><th>名称</th><th>类型</th><th>大小</th><th>更新时间</th><th>操作</th></tr>
              </thead>
              <tbody id="rows"></tbody>
            </table>
          </div>
        </div>
      </section>

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
    </div>
  )
}
