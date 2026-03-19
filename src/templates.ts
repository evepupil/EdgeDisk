type DashboardOptions = { appName: string };
type ShareOptions = { appName: string; shareCode: string };

const styles = `
  :root{color-scheme:dark;--line:#33415566;--text:#e2e8f0;--muted:#94a3b8;--brand:#60a5fa;--brand2:#22d3ee;--danger:#fb7185;--ok:#34d399;font-family:Inter,system-ui,sans-serif}
  *{box-sizing:border-box}body{margin:0;background:linear-gradient(180deg,#08111f,#0b1220);color:var(--text)}a{text-decoration:none;color:inherit}button,input,select{font:inherit}
  .page{width:min(1240px,calc(100% - 28px));margin:22px auto}.hero,.card{background:#0f172acc;border:1px solid var(--line);border-radius:20px;backdrop-filter:blur(12px)}
  .hero{display:flex;justify-content:space-between;gap:16px;padding:22px}.hero h1{margin:0;font-size:28px}.hero p{margin:8px 0 0;color:var(--muted)}
  .grid{display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-top:16px}.card-head,.card-body{padding:18px}.card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
  .toolbar,.actions,.crumbs,.row-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.crumbs button{border:none;background:none;color:var(--muted);padding:0;cursor:pointer}
  .btn,.pick{display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:0 14px;border-radius:12px;border:1px solid var(--line);background:#0f172a;color:var(--text);cursor:pointer}
  .btn.primary,.pick.primary{background:linear-gradient(135deg,var(--brand),var(--brand2));border-color:transparent;color:#fff}.btn.danger{border-color:#fb718566;color:#fecdd3}.btn.small{min-height:32px;padding:0 10px;font-size:13px}.pick input{display:none}
  .badge{display:inline-flex;padding:8px 12px;border-radius:999px;border:1px solid #22c55e55;background:#16a34a22;color:#bbf7d0;font-size:13px}
  .drop{margin:0 18px 18px;padding:14px;border:1px dashed #60a5fa66;border-radius:14px;color:var(--muted)}.drop.active{background:#0891b233;color:#cffafe}
  .status{min-height:22px;color:var(--muted);margin-bottom:12px}.status.error{color:#fecaca}.status.success{color:#bbf7d0}.muted{color:var(--muted)}.mono{font-family:ui-monospace,Consolas,monospace}
  .table{overflow:auto;border:1px solid var(--line);border-radius:16px}table{width:100%;border-collapse:collapse}th,td{padding:13px 14px;text-align:left;border-bottom:1px solid #33415533;white-space:nowrap;font-size:14px;vertical-align:middle}th{position:sticky;top:0;background:#0f172af2;color:var(--muted)}tr:last-child td{border-bottom:none}.name{min-width:260px}.row{cursor:pointer}
  .stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.stat,.info{padding:14px;border:1px solid var(--line);border-radius:14px;background:#0f172a88}.stat strong{display:block;margin-top:6px;font-size:22px}.stack{display:grid;gap:10px}
  .share-list{display:grid;gap:10px;max-height:240px;overflow:auto}.share-item{padding:12px;border:1px solid var(--line);border-radius:12px;background:#0f172a88}.share-item-head{display:flex;justify-content:space-between;gap:10px;align-items:center}.share-meta{display:grid;gap:6px;margin-top:8px;color:var(--muted);font-size:13px}
  dialog{width:min(640px,calc(100vw - 24px));border:1px solid var(--line);border-radius:18px;padding:0;background:#08111ff7;color:var(--text)}dialog::backdrop{background:#020617aa}.modal-head,.modal-body{padding:18px}.modal-head{border-bottom:1px solid var(--line)}.modal-head h2{margin:0}.input,.select{width:100%;min-height:42px;padding:0 12px;border-radius:12px;border:1px solid var(--line);background:#0f172a;color:var(--text)}
  .form-grid{display:grid;grid-template-columns:1fr 180px;gap:10px}.empty{padding:22px;text-align:center;color:var(--muted)}
  @media (max-width:960px){.grid{grid-template-columns:1fr}.hero{flex-direction:column}.form-grid{grid-template-columns:1fr}}
`;

function safe(value: string): string {
  return value.replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

export function renderDashboardHtml(options: DashboardOptions): string {
  const appName = safe(options.appName);
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${appName}</title>
  <style>${styles}</style>
</head>
<body>
  <div class="page">
    <section class="hero">
      <div>
        <h1>${appName}</h1>
        <p>个人轻网盘：上传、浏览、查看详情、删除、短链分享、过期时间和撤销分享。</p>
      </div>
      <div class="actions">
        <span class="badge" id="who">正在验证身份…</span>
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
            <label class="pick primary">上传文件<input id="pickFiles" type="file" multiple /></label>
            <label class="pick">上传文件夹<input id="pickFolder" type="file" multiple webkitdirectory directory /></label>
          </div>
        </div>
        <div class="drop" id="dropzone">拖拽文件或文件夹到这里，自动上传到当前目录。</div>
        <div class="card-body">
          <div class="status" id="status"></div>
          <div class="table">
            <table>
              <thead>
                <tr><th>名称</th><th>类型</th><th>大小</th><th>更新时间</th><th>MIME</th><th>操作</th></tr>
              </thead>
              <tbody id="rows"></tbody>
            </table>
          </div>
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
          <div class="info">文件支持详情、下载、分享、删除。文件夹支持进入、分享、整目录删除。</div>
          <div class="info">分享现在支持永久、1 天、7 天、30 天，并可在分享弹窗里随时撤销。</div>
        </div>
      </aside>
    </div>
  </div>

  <dialog id="detailDialog">
    <div class="modal-head"><h2>对象信息</h2></div>
    <div class="modal-body">
      <div class="stack" id="detailBody"></div>
      <div class="actions">
        <button class="btn" id="openFile">在线打开</button>
        <button class="btn primary" id="downloadFile">下载</button>
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

  <script>
    const state={prefix:'',session:null,detail:null,share:null};
    const e={who:document.getElementById('who'),refresh:document.getElementById('refresh'),crumbs:document.getElementById('crumbs'),rows:document.getElementById('rows'),status:document.getElementById('status'),folderCount:document.getElementById('folderCount'),fileCount:document.getElementById('fileCount'),pathView:document.getElementById('pathView'),pickFiles:document.getElementById('pickFiles'),pickFolder:document.getElementById('pickFolder'),dropzone:document.getElementById('dropzone'),detailDialog:document.getElementById('detailDialog'),detailBody:document.getElementById('detailBody'),openFile:document.getElementById('openFile'),downloadFile:document.getElementById('downloadFile'),shareFromDetail:document.getElementById('shareFromDetail'),deleteFromDetail:document.getElementById('deleteFromDetail'),closeDetail:document.getElementById('closeDetail'),shareDialog:document.getElementById('shareDialog'),shareTarget:document.getElementById('shareTarget'),shareLink:document.getElementById('shareLink'),shareExpiry:document.getElementById('shareExpiry'),createShare:document.getElementById('createShare'),copyShare:document.getElementById('copyShare'),refreshShares:document.getElementById('refreshShares'),closeShare:document.getElementById('closeShare'),shareList:document.getElementById('shareList')};
    const fmt=new Intl.NumberFormat('zh-CN');
    const esc=(v)=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
    const bytes=(n)=>{if(n==null)return '-';const u=['B','KB','MB','GB','TB'];let v=Number(n),i=0;while(v>=1024&&i<u.length-1){v/=1024;i++}return v.toFixed(v>=100||i===0?0:1)+' '+u[i]};
    const time=(v)=>v?new Date(v).toLocaleString('zh-CN',{hour12:false}):'-';
    const isFolder=(path)=>String(path||'').endsWith('/');
    const trimSlash=(value)=>{const input=String(value||'');return input.endsWith('/')?input.slice(0,-1):input};
    const setStatus=(t,k='')=>{e.status.textContent=t;e.status.className=k?'status '+k:'status'};
    const api=async(url,opt)=>{const r=await fetch(url,opt);const c=r.headers.get('content-type')||'';const d=c.includes('application/json')?await r.json():await r.text();if(!r.ok)throw new Error(typeof d==='string'?d:(d.error||r.statusText));return d};
    const fileUrl=(path,download)=>'/api/file?path='+encodeURIComponent(path)+(download?'&download=1':'');
    function crumbsRender(prefix){e.crumbs.innerHTML='';const root=document.createElement('button');root.textContent='root';root.onclick=()=>load('');e.crumbs.appendChild(root);const plain=trimSlash(prefix);const parts=plain?plain.split('/'):[];let current='';for(const part of parts){const sep=document.createElement('span');sep.textContent='/';e.crumbs.appendChild(sep);current+=part+'/';const btn=document.createElement('button');btn.textContent=part;const target=current;btn.onclick=()=>load(target);e.crumbs.appendChild(btn)}}
    async function session(){const data=await api('/api/session');state.session=data;e.who.textContent='已登录：'+data.email}
    async function load(prefix=state.prefix){state.prefix=prefix;crumbsRender(prefix);e.pathView.textContent=prefix?'/'+prefix:'/';setStatus('正在加载目录…');try{const data=await api('/api/list?prefix='+encodeURIComponent(prefix));renderRows(data);e.folderCount.textContent=fmt.format(data.folders.length);e.fileCount.textContent=fmt.format(data.files.length);setStatus('已加载 '+fmt.format(data.folders.length+data.files.length)+' 个项目','success')}catch(err){setStatus(err.message||'目录加载失败','error')}}
    function actionButton(label,action,kind){return '<button class="btn small'+(kind?' '+kind:'')+'" type="button" data-action="'+action+'">'+label+'</button>'}
    function renderRows(data){if(!data.folders.length&&!data.files.length){e.rows.innerHTML='<tr><td colspan="6" class="empty">当前目录为空，可以直接上传文件或文件夹。</td></tr>';return}const html=[];for(const folder of data.folders){html.push('<tr class="row" data-kind="folder" data-path="'+esc(folder.path)+'"><td class="name">📁 '+esc(folder.name)+'</td><td>文件夹</td><td>-</td><td>-</td><td>-</td><td><div class="row-actions">'+actionButton('进入','enter')+actionButton('分享','share')+actionButton('删除','delete','danger')+'</div></td></tr>')}for(const file of data.files){html.push('<tr class="row" data-kind="file" data-path="'+esc(file.path)+'"><td class="name">📄 '+esc(file.name)+'</td><td>文件</td><td>'+bytes(file.size)+'</td><td>'+esc(time(file.uploaded))+'</td><td>'+esc(file.contentType||'-')+'</td><td><div class="row-actions">'+actionButton('详情','detail')+actionButton('分享','share')+actionButton('删除','delete','danger')+'</div></td></tr>')}e.rows.innerHTML=html.join('')}
    async function detail(path){const data=await api('/api/object?path='+encodeURIComponent(path));state.detail={path:path,kind:data.kind};const items=[['路径',data.path],['名称',data.name],['类型',data.kind==='folder'?'文件夹':'文件'],['大小',data.size==null?'-':bytes(data.size)],['上传时间',time(data.uploaded)],['MIME',data.contentType||'-'],['ETag',data.etag||'-']];if(data.childCount!=null)items.push(['目录项目数',String(data.childCount)]);if(data.totalSize!=null)items.push(['目录总大小',bytes(data.totalSize)]);e.detailBody.innerHTML=items.map((item)=>'<div class="info"><div class="muted">'+esc(item[0])+'</div><div class="mono">'+esc(String(item[1]))+'</div></div>').join('');const disabled=data.kind!=='file';e.openFile.disabled=disabled;e.downloadFile.disabled=disabled;e.detailDialog.showModal()}
    async function upload(files){if(!files.length)return;const fd=new FormData();fd.append('basePath',state.prefix);for(const file of files){fd.append('files',file,file.name);fd.append('paths',file.webkitRelativePath||file.name)}setStatus('正在上传 '+fmt.format(files.length)+' 个文件…');try{const out=await api('/api/upload',{method:'POST',body:fd});setStatus('上传完成：'+fmt.format(out.uploaded)+' 个文件','success');await load(state.prefix)}catch(err){setStatus(err.message||'上传失败','error')}}
    function openShare(target){state.share=target;e.shareTarget.textContent='目标：'+target.path;e.shareLink.value='';e.shareDialog.showModal();loadShares().catch((err)=>setStatus(err.message||'加载分享失败','error'))}
    async function createShareLink(){if(!state.share)return;const out=await api('/api/share',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({path:state.share.path,kind:state.share.kind,expiresInDays:Number(e.shareExpiry.value)})});e.shareLink.value=out.url;setStatus('分享链接已生成','success');await loadShares()}
    async function loadShares(){if(!state.share)return;e.shareList.innerHTML='<div class="info">正在加载已有分享…</div>';const data=await api('/api/shares?kind='+encodeURIComponent(state.share.kind)+'&path='+encodeURIComponent(state.share.path));if(!data.shares.length){e.shareList.innerHTML='<div class="info">当前目标还没有有效分享。</div>';return}e.shareList.innerHTML=data.shares.map((item)=>'<div class="share-item"><div class="share-item-head"><strong class="mono">'+esc(item.code)+'</strong><button class="btn small danger" type="button" data-revoke="'+esc(item.code)+'">撤销</button></div><div class="share-meta"><div>链接：<span class="mono">'+esc(item.url)+'</span></div><div>创建时间：'+esc(time(item.createdAt))+'</div><div>过期时间：'+esc(item.expiresAt?time(item.expiresAt):'永久有效')+'</div></div></div>').join('')}
    async function revokeShare(code){await api('/api/share?code='+encodeURIComponent(code),{method:'DELETE'});setStatus('分享已撤销','success');await loadShares()}
    async function deleteTarget(target){const noun=target.kind==='folder'?'文件夹':'文件';const ok=window.confirm('确定删除'+noun+' “'+target.path+'” 吗？此操作不可恢复，并会撤销相关分享。');if(!ok)return;const out=await api('/api/object?path='+encodeURIComponent(target.path),{method:'DELETE'});setStatus('已删除 '+fmt.format(out.deleted)+' 个对象，撤销 '+fmt.format(out.revokedShares)+' 个分享','success');if(state.detail&&state.detail.path===target.path)e.detailDialog.close();await load(state.prefix)}
    e.refresh.onclick=()=>load(state.prefix);e.closeDetail.onclick=()=>e.detailDialog.close();e.closeShare.onclick=()=>e.shareDialog.close();e.openFile.onclick=()=>state.detail&&window.open(fileUrl(state.detail.path,false),'_blank','noopener');e.downloadFile.onclick=()=>state.detail&&window.open(fileUrl(state.detail.path,true),'_blank','noopener');e.shareFromDetail.onclick=()=>state.detail&&openShare(state.detail);e.deleteFromDetail.onclick=()=>state.detail&&deleteTarget(state.detail).catch(err=>setStatus(err.message||'删除失败','error'));e.createShare.onclick=()=>createShareLink().catch(err=>setStatus(err.message||'生成分享失败','error'));e.refreshShares.onclick=()=>loadShares().catch(err=>setStatus(err.message||'加载分享失败','error'));e.copyShare.onclick=async()=>{if(!e.shareLink.value)return;await navigator.clipboard.writeText(e.shareLink.value);setStatus('分享链接已复制','success')};
    e.pickFiles.addEventListener('change',async()=>{const files=Array.from(e.pickFiles.files||[]);await upload(files);e.pickFiles.value=''});e.pickFolder.addEventListener('change',async()=>{const files=Array.from(e.pickFolder.files||[]);await upload(files);e.pickFolder.value=''});
    ['dragenter','dragover'].forEach((name)=>e.dropzone.addEventListener(name,(ev)=>{ev.preventDefault();e.dropzone.classList.add('active')}));['dragleave','drop'].forEach((name)=>e.dropzone.addEventListener(name,(ev)=>{ev.preventDefault();e.dropzone.classList.remove('active')}));e.dropzone.addEventListener('drop',async(ev)=>{const files=[];for(const item of (ev.dataTransfer?.items||[])){if(item.kind!=='file')continue;const file=item.getAsFile();if(file)files.push(file)}await upload(files)});
    e.rows.addEventListener('click',(ev)=>{const target=ev.target.closest('[data-action]');const row=ev.target.closest('tr[data-path]');if(!row)return;const item={path:row.dataset.path,kind:row.dataset.kind};if(target){const action=target.dataset.action;if(action==='enter'){load(item.path);return}if(action==='detail'){detail(item.path).catch(err=>setStatus(err.message||'加载详情失败','error'));return}if(action==='share'){openShare(item);return}if(action==='delete'){deleteTarget(item).catch(err=>setStatus(err.message||'删除失败','error'));return}}if(item.kind==='folder'){load(item.path)}else{detail(item.path).catch(err=>setStatus(err.message||'加载详情失败','error'))}});
    e.shareList.addEventListener('click',(ev)=>{const button=ev.target.closest('[data-revoke]');if(!button)return;revokeShare(button.dataset.revoke).catch(err=>setStatus(err.message||'撤销分享失败','error'))});
    Promise.resolve().then(session).then(()=>load('')).catch(err=>setStatus(err.message||'初始化失败','error'));
  </script>
</body>
</html>`;
}

export function renderShareHtml(options: ShareOptions): string {
  const appName = safe(options.appName);
  const shareCode = safe(options.shareCode);
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${appName} 分享</title>
  <style>${styles}</style>
</head>
<body>
  <div class="page">
    <section class="hero">
      <div>
        <h1>${appName} 分享</h1>
        <p>浏览公开分享的文件或文件夹，并按需下载。</p>
      </div>
      <div class="actions"><a class="btn" href="/app">进入后台</a></div>
    </section>
    <section class="card" style="margin-top:16px">
      <div class="card-head">
        <div>
          <div class="muted">分享编号</div>
          <div class="mono">${shareCode}</div>
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
  </div>
  <script>
    const state={code:${JSON.stringify(shareCode)},sub:'',selected:new Set(),mode:'folder'};
    const e={crumbs:document.getElementById('crumbs'),refresh:document.getElementById('refresh'),downloadSelected:document.getElementById('downloadSelected'),status:document.getElementById('status'),summary:document.getElementById('summary'),rows:document.getElementById('rows')};
    const esc=(v)=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
    const bytes=(n)=>{if(n==null)return '-';const u=['B','KB','MB','GB','TB'];let v=Number(n),i=0;while(v>=1024&&i<u.length-1){v/=1024;i++}return v.toFixed(v>=100||i===0?0:1)+' '+u[i]};
    const time=(v)=>v?new Date(v).toLocaleString('zh-CN',{hour12:false}):'-';
    const trimSlash=(value)=>{const input=String(value||'');return input.endsWith('/')?input.slice(0,-1):input};
    const setStatus=(t,k='')=>{e.status.textContent=t;e.status.className=k?'status '+k:'status'};
    const api=async(url)=>{const r=await fetch(url);const c=r.headers.get('content-type')||'';const d=c.includes('application/json')?await r.json():await r.text();if(!r.ok)throw new Error(typeof d==='string'?d:(d.error||r.statusText));return d};
    const sharedUrl=(path,download)=>path?('/s/'+state.code+'/file?path='+encodeURIComponent(path)+(download?'&download=1':'')):('/s/'+state.code+'/file'+(download?'?download=1':''));
    function updatePick(){e.downloadSelected.disabled=state.mode!=='folder'||state.selected.size===0}
    function crumbsRender(){e.crumbs.innerHTML='';const root=document.createElement('button');root.textContent='分享根目录';root.onclick=()=>load('');e.crumbs.appendChild(root);const plain=trimSlash(state.sub);const parts=plain?plain.split('/'):[];let current='';for(const part of parts){const sep=document.createElement('span');sep.textContent='/';e.crumbs.appendChild(sep);current+=part+'/';const btn=document.createElement('button');btn.textContent=part;const target=current;btn.onclick=()=>load(target);e.crumbs.appendChild(btn)}}
    function summaryRender(data){const list=[['类型',data.kind==='file'?'文件分享':'文件夹分享'],['原始路径',data.rootPath],['当前目录',data.currentPrefix||data.rootPath],['创建时间',time(data.createdAt)],['过期时间',data.expiresAt?time(data.expiresAt):'永久有效'],['项目数量',String((data.folders?.length||0)+(data.files?.length||0)||1)]];e.summary.innerHTML=list.map((item)=>'<div class="info"><div class="muted">'+esc(item[0])+'</div><div class="mono">'+esc(String(item[1]))+'</div></div>').join('')}
    function rowsRender(data){state.selected.clear();updatePick();if(data.kind==='file'){state.mode='file';e.rows.innerHTML='<tr><td></td><td class="name">📄 '+esc(data.file.name)+'</td><td>文件</td><td>'+bytes(data.file.size)+'</td><td>'+esc(time(data.file.uploaded))+'</td><td><div class="actions"><a class="btn" href="'+sharedUrl('',false)+'" target="_blank" rel="noopener">在线打开</a><a class="btn primary" href="'+sharedUrl('',true)+'">下载</a></div></td></tr>';return}state.mode='folder';if(!data.folders.length&&!data.files.length){e.rows.innerHTML='<tr><td colspan="6" class="empty">这个分享目录当前没有可展示的文件。</td></tr>';return}const html=[];for(const folder of data.folders){html.push('<tr class="row" data-folder="'+esc(folder.subpath)+'"><td></td><td class="name">📁 '+esc(folder.name)+'</td><td>文件夹</td><td>-</td><td>-</td><td class="muted">点击进入</td></tr>')}for(const file of data.files){html.push('<tr data-file="'+esc(file.subpath)+'"><td><input type="checkbox" data-pick="'+esc(file.subpath)+'" /></td><td class="name">📄 '+esc(file.name)+'</td><td>文件</td><td>'+bytes(file.size)+'</td><td>'+esc(time(file.uploaded))+'</td><td><div class="actions"><a class="btn" href="'+sharedUrl(file.subpath,false)+'" target="_blank" rel="noopener">在线打开</a><a class="btn primary" href="'+sharedUrl(file.subpath,true)+'">下载</a></div></td></tr>')}e.rows.innerHTML=html.join('');for(const row of e.rows.querySelectorAll('tr[data-folder]')){row.onclick=()=>load(row.dataset.folder)}for(const box of e.rows.querySelectorAll('input[data-pick]')){box.addEventListener('change',()=>{const v=box.dataset.pick;if(!v)return;if(box.checked)state.selected.add(v);else state.selected.delete(v);updatePick()})}}
    async function load(sub=state.sub){state.sub=sub;crumbsRender();setStatus('正在加载分享内容…');try{const data=await api('/share-api/'+state.code+'?sub='+encodeURIComponent(sub));summaryRender(data);rowsRender(data);setStatus('分享内容已更新','success')}catch(err){setStatus(err.message||'分享加载失败','error')}}
    e.refresh.onclick=()=>load(state.sub);e.downloadSelected.onclick=()=>{for(const path of state.selected){window.open(sharedUrl(path,true),'_blank','noopener')}};load('');
  </script>
</body>
</html>`;
}
