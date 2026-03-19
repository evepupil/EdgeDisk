import { safe, styles } from "./styles.ts";

type ShareOptions = { appName: string; shareCode: string };

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
