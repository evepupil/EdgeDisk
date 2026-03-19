import { safe, styles } from "./styles.ts";

type DashboardOptions = { appName: string };

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
        <p>个人轻网盘：上传、浏览、查看详情、删除、移动/重命名、创建文件夹、短链分享与撤销。</p>
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
            <button class="btn" id="newFolderButton">新建文件夹</button>
            <button class="btn" id="importUrlButton">URL 导入</button>
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

  <script>
    const viewStorageKey='edgedisk:view-mode';
    const state={prefix:'',session:null,detail:null,share:null,viewMode:localStorage.getItem(viewStorageKey)||'table'};
    const e={who:document.getElementById('who'),refresh:document.getElementById('refresh'),crumbs:document.getElementById('crumbs'),rows:document.getElementById('rows'),iconView:document.getElementById('iconView'),tableView:document.getElementById('tableView'),status:document.getElementById('status'),folderCount:document.getElementById('folderCount'),fileCount:document.getElementById('fileCount'),pathView:document.getElementById('pathView'),pickFiles:document.getElementById('pickFiles'),pickFolder:document.getElementById('pickFolder'),dropzone:document.getElementById('dropzone'),newFolderButton:document.getElementById('newFolderButton'),importUrlButton:document.getElementById('importUrlButton'),tableViewButton:document.getElementById('tableViewButton'),iconViewButton:document.getElementById('iconViewButton'),detailDialog:document.getElementById('detailDialog'),detailBody:document.getElementById('detailBody'),openFile:document.getElementById('openFile'),downloadFile:document.getElementById('downloadFile'),moveFromDetail:document.getElementById('moveFromDetail'),shareFromDetail:document.getElementById('shareFromDetail'),deleteFromDetail:document.getElementById('deleteFromDetail'),closeDetail:document.getElementById('closeDetail'),shareDialog:document.getElementById('shareDialog'),shareTarget:document.getElementById('shareTarget'),shareLink:document.getElementById('shareLink'),shareExpiry:document.getElementById('shareExpiry'),createShare:document.getElementById('createShare'),copyShare:document.getElementById('copyShare'),refreshShares:document.getElementById('refreshShares'),closeShare:document.getElementById('closeShare'),shareList:document.getElementById('shareList')};
    const fmt=new Intl.NumberFormat('zh-CN');
    const esc=(v)=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
    const bytes=(n)=>{if(n==null)return '-';const u=['B','KB','MB','GB','TB'];let v=Number(n),i=0;while(v>=1024&&i<u.length-1){v/=1024;i++}return v.toFixed(v>=100||i===0?0:1)+' '+u[i]};
    const time=(v)=>v?new Date(v).toLocaleString('zh-CN',{hour12:false}):'-';
    const trimSlash=(value)=>{const input=String(value||'');return input.endsWith('/')?input.slice(0,-1):input};
    const normalizeInputPath=(value)=>{let input=String(value||'').trim().split(String.fromCharCode(92)).join('/');while(input.startsWith('/'))input=input.slice(1);while(input.endsWith('/'))input=input.slice(0,-1);return input};
    const ensureFolderPath=(value)=>{const input=normalizeInputPath(value);return input?input+'/':''};
    const setStatus=(t,k='')=>{e.status.textContent=t;e.status.className=k?'status '+k:'status'};
    const api=async(url,opt)=>{const r=await fetch(url,opt);const c=r.headers.get('content-type')||'';const d=c.includes('application/json')?await r.json():await r.text();if(!r.ok)throw new Error(typeof d==='string'?d:(d.error||r.statusText));return d};
    const fileUrl=(path,download)=>'/api/file?path='+encodeURIComponent(path)+(download?'&download=1':'');
    const parentDir=(path)=>{const plain=trimSlash(path);if(!plain.includes('/'))return '';const idx=plain.lastIndexOf('/');return plain.slice(0,idx+1)};
    function crumbsRender(prefix){e.crumbs.innerHTML='';const root=document.createElement('button');root.textContent='root';root.onclick=()=>load('');e.crumbs.appendChild(root);const plain=trimSlash(prefix);const parts=plain?plain.split('/'):[];let current='';for(const part of parts){const sep=document.createElement('span');sep.textContent='/';e.crumbs.appendChild(sep);current+=part+'/';const btn=document.createElement('button');btn.textContent=part;const target=current;btn.onclick=()=>load(target);e.crumbs.appendChild(btn)}}
    function setViewMode(mode){state.viewMode=mode;localStorage.setItem(viewStorageKey,mode);e.tableView.classList.toggle('hidden',mode!=='table');e.iconView.classList.toggle('hidden',mode!=='icon');e.tableViewButton.classList.toggle('active',mode==='table');e.iconViewButton.classList.toggle('active',mode==='icon')}
    async function session(){const data=await api('/api/session');state.session=data;e.who.textContent='已登录：'+data.email}
    async function load(prefix=state.prefix){state.prefix=prefix;crumbsRender(prefix);e.pathView.textContent=prefix?'/'+prefix:'/';setStatus('正在加载目录…');try{const data=await api('/api/list?prefix='+encodeURIComponent(prefix));renderAll(data);e.folderCount.textContent=fmt.format(data.folders.length);e.fileCount.textContent=fmt.format(data.files.length);setStatus('已加载 '+fmt.format(data.folders.length+data.files.length)+' 个项目','success')}catch(err){setStatus(err.message||'目录加载失败','error')}}
    function actionButton(label,action,kind){return '<button class="btn small'+(kind?' '+kind:'')+'" type="button" data-action="'+action+'">'+label+'</button>'}
    function renderAll(data){renderRows(data);renderCards(data);setViewMode(state.viewMode)}
    function renderRows(data){if(!data.folders.length&&!data.files.length){e.rows.innerHTML='<tr><td colspan="6" class="empty">当前目录为空，可以直接上传文件或文件夹。</td></tr>';return}const html=[];for(const folder of data.folders){html.push('<tr class="row" data-kind="folder" data-path="'+esc(folder.path)+'"><td class="name">📁 '+esc(folder.name)+'</td><td>文件夹</td><td>-</td><td>-</td><td>-</td><td><div class="row-actions">'+actionButton('进入','enter')+actionButton('移动/重命名','move')+actionButton('分享','share')+actionButton('删除','delete','danger')+'</div></td></tr>')}for(const file of data.files){html.push('<tr class="row" data-kind="file" data-path="'+esc(file.path)+'"><td class="name">📄 '+esc(file.name)+'</td><td>文件</td><td>'+bytes(file.size)+'</td><td>'+esc(time(file.uploaded))+'</td><td>'+esc(file.contentType||'-')+'</td><td><div class="row-actions">'+actionButton('详情','detail')+actionButton('移动/重命名','move')+actionButton('分享','share')+actionButton('删除','delete','danger')+'</div></td></tr>')}e.rows.innerHTML=html.join('')}
    function renderCards(data){if(!data.folders.length&&!data.files.length){e.iconView.innerHTML='<div class="info">当前目录为空，可以先创建文件夹或上传文件。</div>';return}const html=[];for(const folder of data.folders){html.push('<div class="card-item" data-kind="folder" data-path="'+esc(folder.path)+'"><div class="card-item-top"><div class="card-icon">📁</div>'+actionButton('进入','enter')+'</div><div class="card-name">'+esc(folder.name)+'</div><div class="card-meta"><div>文件夹</div><div class="row-actions">'+actionButton('移动/重命名','move')+actionButton('分享','share')+actionButton('删除','delete','danger')+'</div></div></div>')}for(const file of data.files){html.push('<div class="card-item" data-kind="file" data-path="'+esc(file.path)+'"><div class="card-item-top"><div class="card-icon">📄</div>'+actionButton('详情','detail')+'</div><div class="card-name">'+esc(file.name)+'</div><div class="card-meta"><div>'+bytes(file.size)+'</div><div>'+esc(time(file.uploaded))+'</div><div class="row-actions">'+actionButton('移动/重命名','move')+actionButton('分享','share')+actionButton('删除','delete','danger')+'</div></div></div>')}e.iconView.innerHTML=html.join('')}
    async function detail(path){const data=await api('/api/object?path='+encodeURIComponent(path));state.detail={path:path,kind:data.kind};const items=[['路径',data.path],['名称',data.name],['类型',data.kind==='folder'?'文件夹':'文件'],['大小',data.size==null?'-':bytes(data.size)],['上传时间',time(data.uploaded)],['MIME',data.contentType||'-'],['ETag',data.etag||'-']];if(data.childCount!=null)items.push(['目录项目数',String(data.childCount)]);if(data.totalSize!=null)items.push(['目录总大小',bytes(data.totalSize)]);e.detailBody.innerHTML=items.map((item)=>'<div class="info"><div class="muted">'+esc(item[0])+'</div><div class="mono">'+esc(String(item[1]))+'</div></div>').join('');const disabled=data.kind!=='file';e.openFile.disabled=disabled;e.downloadFile.disabled=disabled;e.detailDialog.showModal()}
    async function upload(files){if(!files.length)return;const fd=new FormData();fd.append('basePath',state.prefix);for(const file of files){fd.append('files',file,file.name);fd.append('paths',file.webkitRelativePath||file.name)}setStatus('正在上传 '+fmt.format(files.length)+' 个文件…');try{const out=await api('/api/upload',{method:'POST',body:fd});setStatus('上传完成：'+fmt.format(out.uploaded)+' 个文件','success');await load(state.prefix)}catch(err){setStatus(err.message||'上传失败','error')}}
    async function createFolderPrompt(){const name=window.prompt('输入新文件夹名称');if(!name)return;const path=ensureFolderPath(state.prefix+name);const out=await api('/api/folder',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({path})});setStatus('文件夹已创建：'+out.path,'success');await load(state.prefix)}
    async function importUrlPrompt(){const url=window.prompt('输入远程文件 URL（仅支持 http/https）');if(!url)return;const fileName=window.prompt('可选：自定义文件名（留空则自动推断）','')||'';const overwrite=window.confirm('如果同名文件已存在，是否覆盖？');const out=await api('/api/import-url',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url,directory:state.prefix,fileName,overwrite})});setStatus('URL 导入完成：'+out.path,'success');await load(state.prefix)}
    function openShare(target){state.share=target;e.shareTarget.textContent='目标：'+target.path;e.shareLink.value='';e.shareDialog.showModal();loadShares().catch((err)=>setStatus(err.message||'加载分享失败','error'))}
    async function createShareLink(){if(!state.share)return;const out=await api('/api/share',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({path:state.share.path,kind:state.share.kind,expiresInDays:Number(e.shareExpiry.value)})});e.shareLink.value=out.url;setStatus('分享链接已生成','success');await loadShares()}
    async function loadShares(){if(!state.share)return;e.shareList.innerHTML='<div class="info">正在加载已有分享…</div>';const data=await api('/api/shares?kind='+encodeURIComponent(state.share.kind)+'&path='+encodeURIComponent(state.share.path));if(!data.shares.length){e.shareList.innerHTML='<div class="info">当前目标还没有有效分享。</div>';return}e.shareList.innerHTML=data.shares.map((item)=>'<div class="share-item"><div class="share-item-head"><strong class="mono">'+esc(item.code)+'</strong><button class="btn small danger" type="button" data-revoke="'+esc(item.code)+'">撤销</button></div><div class="share-meta"><div>链接：<span class="mono">'+esc(item.url)+'</span></div><div>创建时间：'+esc(time(item.createdAt))+'</div><div>过期时间：'+esc(item.expiresAt?time(item.expiresAt):'永久有效')+'</div></div></div>').join('')}
    async function revokeShare(code){await api('/api/share?code='+encodeURIComponent(code),{method:'DELETE'});setStatus('分享已撤销','success');await loadShares()}
    async function moveTarget(target){const message=target.kind==='folder'?'输入新的完整文件夹路径（示例：docs/archive/）':'输入新的完整文件路径（示例：docs/report.pdf）';const next=window.prompt(message,target.path);if(!next)return;const targetPath=target.kind==='folder'?ensureFolderPath(next):normalizeInputPath(next);if(!targetPath)return;const out=await api('/api/move',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind:target.kind,path:target.path,targetPath})});setStatus('已移动 '+fmt.format(out.moved)+' 个对象，更新 '+fmt.format(out.updatedShares)+' 个分享','success');if(state.detail&&state.detail.path===target.path){state.detail={path:targetPath,kind:target.kind};e.detailDialog.close()}if(target.kind==='folder'&&state.prefix.startsWith(target.path)){await load(parentDir(targetPath))}else{await load(state.prefix)}}
    async function deleteTarget(target){const noun=target.kind==='folder'?'文件夹':'文件';const ok=window.confirm('确定删除'+noun+' “'+target.path+'” 吗？此操作不可恢复，并会撤销相关分享。');if(!ok)return;const out=await api('/api/object?path='+encodeURIComponent(target.path),{method:'DELETE'});setStatus('已删除 '+fmt.format(out.deleted)+' 个对象，撤销 '+fmt.format(out.revokedShares)+' 个分享','success');if(state.detail&&state.detail.path===target.path)e.detailDialog.close();await load(state.prefix)}
    function handleItemAction(action,item){if(action==='enter'){load(item.path);return}if(action==='detail'){detail(item.path).catch(err=>setStatus(err.message||'加载详情失败','error'));return}if(action==='share'){openShare(item);return}if(action==='move'){moveTarget(item).catch(err=>setStatus(err.message||'移动失败','error'));return}if(action==='delete'){deleteTarget(item).catch(err=>setStatus(err.message||'删除失败','error'));return}}
    e.refresh.onclick=()=>load(state.prefix);e.newFolderButton.onclick=()=>createFolderPrompt().catch(err=>setStatus(err.message||'创建文件夹失败','error'));e.importUrlButton.onclick=()=>importUrlPrompt().catch(err=>setStatus(err.message||'URL 导入失败','error'));e.tableViewButton.onclick=()=>setViewMode('table');e.iconViewButton.onclick=()=>setViewMode('icon');e.closeDetail.onclick=()=>e.detailDialog.close();e.closeShare.onclick=()=>e.shareDialog.close();e.openFile.onclick=()=>state.detail&&window.open(fileUrl(state.detail.path,false),'_blank','noopener');e.downloadFile.onclick=()=>state.detail&&window.open(fileUrl(state.detail.path,true),'_blank','noopener');e.moveFromDetail.onclick=()=>state.detail&&moveTarget(state.detail).catch(err=>setStatus(err.message||'移动失败','error'));e.shareFromDetail.onclick=()=>state.detail&&openShare(state.detail);e.deleteFromDetail.onclick=()=>state.detail&&deleteTarget(state.detail).catch(err=>setStatus(err.message||'删除失败','error'));e.createShare.onclick=()=>createShareLink().catch(err=>setStatus(err.message||'生成分享失败','error'));e.refreshShares.onclick=()=>loadShares().catch(err=>setStatus(err.message||'加载分享失败','error'));e.copyShare.onclick=async()=>{if(!e.shareLink.value)return;await navigator.clipboard.writeText(e.shareLink.value);setStatus('分享链接已复制','success')};
    e.pickFiles.addEventListener('change',async()=>{const files=Array.from(e.pickFiles.files||[]);await upload(files);e.pickFiles.value=''});e.pickFolder.addEventListener('change',async()=>{const files=Array.from(e.pickFolder.files||[]);await upload(files);e.pickFolder.value=''});
    ['dragenter','dragover'].forEach((name)=>e.dropzone.addEventListener(name,(ev)=>{ev.preventDefault();e.dropzone.classList.add('active')}));['dragleave','drop'].forEach((name)=>e.dropzone.addEventListener(name,(ev)=>{ev.preventDefault();e.dropzone.classList.remove('active')}));e.dropzone.addEventListener('drop',async(ev)=>{const files=[];for(const item of (ev.dataTransfer?.items||[])){if(item.kind!=='file')continue;const file=item.getAsFile();if(file)files.push(file)}await upload(files)});
    e.rows.addEventListener('click',(ev)=>{const row=ev.target.closest('tr[data-path]');if(!row)return;const item={path:row.dataset.path,kind:row.dataset.kind};const button=ev.target.closest('[data-action]');if(button){handleItemAction(button.dataset.action,item);return}if(item.kind==='folder'){load(item.path)}else{detail(item.path).catch(err=>setStatus(err.message||'加载详情失败','error'))}});
    e.iconView.addEventListener('click',(ev)=>{const card=ev.target.closest('[data-path]');if(!card)return;const item={path:card.dataset.path,kind:card.dataset.kind};const button=ev.target.closest('[data-action]');if(button){handleItemAction(button.dataset.action,item);return}if(item.kind==='folder'){load(item.path)}else{detail(item.path).catch(err=>setStatus(err.message||'加载详情失败','error'))}});
    e.shareList.addEventListener('click',(ev)=>{const button=ev.target.closest('[data-revoke]');if(!button)return;revokeShare(button.dataset.revoke).catch(err=>setStatus(err.message||'撤销分享失败','error'))});
    setViewMode(state.viewMode==='icon'?'icon':'table');
    Promise.resolve().then(session).then(()=>load('')).catch(err=>setStatus(err.message||'初始化失败','error'));
  </script>
</body>
</html>`;
}
