import { Icon } from '../ui/icon'

export function DashboardDialogs() {
  return <>
    <dialog id="folderDialog"><form class="dialog-form" id="folderForm"><DialogHead title="新建文件夹" closeId="closeFolderDialog" /><p class="muted" id="folderLocation" /><label>文件夹名称<input id="folderName" required autocomplete="off" /></label><DialogActions submitLabel="创建" /></form></dialog>
    <dialog id="importDialog"><form class="dialog-form" id="importForm"><DialogHead title="从 URL 导入" closeId="closeImportDialog" /><p class="muted" id="importLocation" /><label>文件地址<input id="importUrl" type="url" placeholder="https://example.com/file.zip" required /></label><label>文件名（可选）<input id="importFileName" placeholder="留空后自动识别" /></label><label class="check-label"><input id="importOverwrite" type="checkbox" />覆盖同名文件</label><DialogActions submitLabel="开始导入" /></form></dialog>
    <dialog id="moveDialog"><form class="dialog-form" id="moveForm"><DialogHead title="移动或重命名" closeId="closeMoveDialog" /><p class="muted" id="moveSource" /><label>目标路径<input id="moveTarget" required /></label><DialogActions submitLabel="确认移动" /></form></dialog>
    <dialog id="deleteDialog"><form class="dialog-form" id="deleteForm"><DialogHead title="移入回收站" closeId="closeDeleteDialog" /><p id="deleteMessage" /><p class="muted">相关分享会同时撤销，项目仍可从回收站恢复。</p><DialogActions submitLabel="确认删除" danger /></form></dialog>
    <dialog id="shareDialog"><div class="dialog-form"><DialogHead title="分享链接" closeId="closeShareDialog" /><div class="target-line" id="shareTarget" /><div class="form-row"><label>有效期<select id="shareExpiry"><option value="0">永久有效</option><option value="1">1 天</option><option value="7" selected>7 天</option><option value="30">30 天</option></select></label><button class="btn primary align-end" id="createShare" type="button"><Icon name="link" />生成链接</button></div><label>最新链接<div class="copy-field"><input id="shareLink" readonly /><button class="icon-btn" id="copyShare" type="button" aria-label="复制链接"><Icon name="copy" /></button></div></label><div class="dialog-subhead"><strong>已有分享</strong><button class="icon-btn" id="refreshShares" type="button" aria-label="刷新分享"><Icon name="refresh-cw" /></button></div><div class="data-list compact" id="shareList" /></div></dialog>
    <dialog id="playerDialog"><div class="dialog-form player-dialog"><DialogHead title="媒体预览" titleId="playerTitle" closeId="closePlayer" /><div class="player-container" id="playerContainer" /><a class="btn primary" id="playerDownload" download><Icon name="download" />下载文件</a></div></dialog>
    <dialog id="importTaskDialog"><div class="dialog-form"><DialogHead title="导入任务详情" closeId="closeImportTask" /><dl class="detail-list" id="importTaskBody" /></div></dialog>
    <dialog id="permanentDeleteDialog"><form class="dialog-form" id="permanentDeleteForm"><DialogHead title="彻底删除" closeId="closePermanentDelete" /><p id="permanentDeleteMessage" /><p class="danger-text">此操作无法恢复。</p><DialogActions submitLabel="彻底删除" danger /></form></dialog>
  </>
}

function DialogHead({ title, titleId, closeId }: { title: string; titleId?: string; closeId: string }) {
  return <div class="dialog-head"><h2 id={titleId}>{title}</h2><button class="icon-btn" id={closeId} type="button" aria-label="关闭"><Icon name="x" /></button></div>
}

function DialogActions({ submitLabel, danger = false }: { submitLabel: string; danger?: boolean }) {
  return <div class="dialog-actions"><button class="btn dialog-cancel" type="button">取消</button><button class={danger ? 'btn danger' : 'btn primary'} type="submit">{submitLabel}</button></div>
}
