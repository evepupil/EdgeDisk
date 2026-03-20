type DashboardPageProps = {
  appName: string
}

export function DashboardPage(props: DashboardPageProps) {
  return (
    <div class="page" id="dashboard-page">
      <section class="hero">
        <div>
          <h1>{props.appName}</h1>
          <p>??????????????????????/??????????????????</p>
        </div>
        <div class="actions">
          <span class="badge" id="who">???????</span>
          <button class="btn" id="refresh">??</button>
        </div>
      </section>

      <div class="grid">
        <section class="card">
          <div class="card-head">
            <div>
              <div class="muted">????</div>
              <div class="crumbs" id="crumbs"></div>
            </div>
            <div class="toolbar">
              <button class="btn" id="newFolderButton">?????</button>
              <button class="btn" id="importUrlButton">URL ??</button>
              <button class="btn active" id="tableViewButton">????</button>
              <button class="btn" id="iconViewButton">????</button>
              <label class="pick primary">????<input id="pickFiles" type="file" multiple /></label>
              <label class="pick">?????<input id="pickFolder" type="file" multiple webkitdirectory directory /></label>
            </div>
          </div>
          <div class="drop" id="dropzone">??????????????????????</div>
          <div class="card-body">
            <div class="status" id="status"></div>
            <div class="table" id="tableView">
              <table>
                <thead>
                  <tr><th>??</th><th>??</th><th>??</th><th>????</th><th>MIME</th><th>??</th></tr>
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
              <div class="muted">??</div>
              <h2 style="margin:6px 0 0;font-size:22px">R2 ????</h2>
            </div>
          </div>
          <div class="card-body stack">
            <div class="stats">
              <div class="stat"><div class="muted">???</div><strong id="folderCount">0</strong></div>
              <div class="stat"><div class="muted">??</div><strong id="fileCount">0</strong></div>
            </div>
            <div class="info"><div class="muted">????</div><div class="mono" id="pathView">/</div></div>
            <div class="info">????????????????????????????</div>
            <div class="info">?????????????????/????????????????</div>
            <div class="info">
              <div class="toolbar" style="justify-content:space-between">
                <div>
                  <div class="muted">URL ????</div>
                  <div style="margin-top:6px">???????????</div>
                </div>
                <button class="btn small" id="refreshImports">??</button>
              </div>
              <div class="task-list" id="importTasks"><div class="empty">??????</div></div>
            </div>
          </div>
        </aside>
      </div>

      <dialog id="detailDialog">
        <div class="modal-head"><h2>????</h2></div>
        <div class="modal-body">
          <div class="stack" id="detailBody"></div>
          <div class="actions">
            <button class="btn" id="openFile">????</button>
            <button class="btn primary" id="downloadFile">??</button>
            <button class="btn" id="moveFromDetail">??/???</button>
            <button class="btn" id="shareFromDetail">??</button>
            <button class="btn danger" id="deleteFromDetail">??</button>
            <button class="btn" id="closeDetail">??</button>
          </div>
        </div>
      </dialog>

      <dialog id="shareDialog">
        <div class="modal-head"><h2>????</h2></div>
        <div class="modal-body">
          <div class="info mono" id="shareTarget"></div>
          <div class="form-grid">
            <input class="input mono" id="shareLink" readonly />
            <select class="select" id="shareExpiry">
              <option value="0">????</option>
              <option value="1">1 ????</option>
              <option value="7" selected>7 ????</option>
              <option value="30">30 ????</option>
            </select>
          </div>
          <div class="actions">
            <button class="btn primary" id="createShare">????</button>
            <button class="btn" id="copyShare">??</button>
            <button class="btn" id="refreshShares">????</button>
            <button class="btn" id="closeShare">??</button>
          </div>
          <div class="share-list" id="shareList"></div>
        </div>
      </dialog>
    </div>
  )
}
