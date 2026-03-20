type SharePageProps = {
  appName: string
  shareCode: string
}

export function SharePage(props: SharePageProps) {
  return (
    <div class="page" id="share-page" data-share-code={props.shareCode}>
      <section class="hero">
        <div>
          <h1>{props.appName} ??</h1>
          <p>????????????????????</p>
        </div>
        <div class="actions"><a class="btn" href="/app">????</a></div>
      </section>
      <section class="card" style="margin-top:16px">
        <div class="card-head">
          <div>
            <div class="muted">????</div>
            <div class="mono">{props.shareCode}</div>
            <div class="crumbs" id="crumbs"></div>
          </div>
          <div class="actions">
            <button class="btn" id="refresh">??</button>
            <button class="btn primary" id="downloadSelected" disabled>????</button>
          </div>
        </div>
        <div class="card-body">
          <div class="status" id="status"></div>
          <div class="stack" id="summary"></div>
          <div class="table">
            <table>
              <thead>
                <tr><th></th><th>??</th><th>??</th><th>??</th><th>????</th><th>??</th></tr>
              </thead>
              <tbody id="rows"></tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
