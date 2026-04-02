// @ts-nocheck
export {}

const viewStorageKey = 'edgedisk:view-mode';
const themeStorageKey = 'edgedisk:theme';
    const state = {
      prefix: '',
      session: null,
      detail: null,
      share: null,
      importTasks: [],
      trashItems: [],
      theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark',
      viewMode: localStorage.getItem(viewStorageKey) || 'table'
    };

    const elements = {
      who: document.getElementById('who'),
      themeToggle: document.getElementById('themeToggle'),
      refresh: document.getElementById('refresh'),
      crumbs: document.getElementById('crumbs'),
      rows: document.getElementById('rows'),
      iconView: document.getElementById('iconView'),
      tableView: document.getElementById('tableView'),
      status: document.getElementById('status'),
      folderCount: document.getElementById('folderCount'),
      fileCount: document.getElementById('fileCount'),
      pathView: document.getElementById('pathView'),
      pickFiles: document.getElementById('pickFiles'),
      pickFolder: document.getElementById('pickFolder'),
      dropzone: document.getElementById('dropzone'),
      newFolderButton: document.getElementById('newFolderButton'),
      importUrlButton: document.getElementById('importUrlButton'),
      trashButton: document.getElementById('trashButton'),
      tableViewButton: document.getElementById('tableViewButton'),
      iconViewButton: document.getElementById('iconViewButton'),
      refreshImports: document.getElementById('refreshImports'),
      importTasks: document.getElementById('importTasks'),
      detailDialog: document.getElementById('detailDialog'),
      detailBody: document.getElementById('detailBody'),
      openFile: document.getElementById('openFile'),
      downloadFile: document.getElementById('downloadFile'),
      moveFromDetail: document.getElementById('moveFromDetail'),
      shareFromDetail: document.getElementById('shareFromDetail'),
      deleteFromDetail: document.getElementById('deleteFromDetail'),
      closeDetail: document.getElementById('closeDetail'),
      shareDialog: document.getElementById('shareDialog'),
      shareTarget: document.getElementById('shareTarget'),
      shareLink: document.getElementById('shareLink'),
      shareExpiry: document.getElementById('shareExpiry'),
      createShare: document.getElementById('createShare'),
      copyShare: document.getElementById('copyShare'),
      refreshShares: document.getElementById('refreshShares'),
      closeShare: document.getElementById('closeShare'),
      shareList: document.getElementById('shareList'),
      playerDialog: document.getElementById('playerDialog'),
      playerTitle: document.getElementById('playerTitle'),
      playerContainer: document.getElementById('playerContainer'),
      playerDownload: document.getElementById('playerDownload'),
      closePlayer: document.getElementById('closePlayer'),
      importTaskDialog: document.getElementById('importTaskDialog'),
      importTaskBody: document.getElementById('importTaskBody'),
      closeImportTask: document.getElementById('closeImportTask'),
      trashDialog: document.getElementById('trashDialog'),
      trashList: document.getElementById('trashList'),
      refreshTrash: document.getElementById('refreshTrash'),
      closeTrash: document.getElementById('closeTrash')
    };

    const numberFormat = new Intl.NumberFormat('zh-CN');
    const taskLabels = { queued: '排队中', running: '导入中', succeeded: '已完成', failed: '失败' };
    const VIDEO_EXTS = new Set(['mp4','webm','ogv','mov','mkv','avi']);
    const AUDIO_EXTS = new Set(['mp3','wav','ogg','flac','aac','m4a','wma','opus']);
    function getMediaType(name) {
      const ext = (name || '').split('.').pop().toLowerCase();
      if (VIDEO_EXTS.has(ext)) return 'video';
      if (AUDIO_EXTS.has(ext)) return 'audio';
      return null;
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
    }

    function formatBytes(size) {
      if (size == null) return '-';
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let value = Number(size);
      let index = 0;
      while (value >= 1024 && index < units.length - 1) {
        value /= 1024;
        index += 1;
      }
      return value.toFixed(value >= 100 || index === 0 ? 0 : 1) + ' ' + units[index];
    }

    function formatTime(value) {
      return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-';
    }

    function trimTrailingSlash(value) {
      const input = String(value || '');
      return input.endsWith('/') ? input.slice(0, -1) : input;
    }

    function normalizeInputPath(value) {
      let input = String(value || '').trim().split(String.fromCharCode(92)).join('/');
      while (input.startsWith('/')) input = input.slice(1);
      while (input.endsWith('/')) input = input.slice(0, -1);
      return input;
    }

    function ensureFolderPath(value) {
      const input = normalizeInputPath(value);
      return input ? input + '/' : '';
    }

    function setStatus(text, kind) {
      elements.status.textContent = text;
      elements.status.className = kind ? 'status ' + kind : 'status';
    }

    function renderThemeToggle() {
      if (!elements.themeToggle) return;
      const isLight = state.theme === 'light';
      elements.themeToggle.textContent = isLight ? '\uD83C\uDF19 \u6697\u8272' : '\u2600\uFE0F \u4EAE\u8272';
      elements.themeToggle.title = isLight ? '\u5207\u6362\u5230\u6697\u8272\u4E3B\u9898' : '\u5207\u6362\u5230\u4EAE\u8272\u4E3B\u9898';
      elements.themeToggle.setAttribute('aria-label', elements.themeToggle.title);
    }

    function applyTheme(nextTheme, persist) {
      state.theme = nextTheme === 'light' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', state.theme);
      if (persist) localStorage.setItem(themeStorageKey, state.theme);
      renderThemeToggle();
    }

    function toggleTheme() {
      applyTheme(state.theme === 'light' ? 'dark' : 'light', true);
    }

    async function api(url, options) {
      const response = await fetch(url, options);
      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await response.json() : await response.text();
      if (!response.ok) {
        throw new Error(typeof data === 'string' ? data : (data.error || response.statusText));
      }
      return data;
    }

    function fileUrl(path, download) {
      return '/api/file?path=' + encodeURIComponent(path) + (download ? '&download=1' : '');
    }

    function parentDir(path) {
      const plain = trimTrailingSlash(path);
      if (!plain.includes('/')) return '';
      return plain.slice(0, plain.lastIndexOf('/') + 1);
    }

    function renderCrumbs(prefix) {
      elements.crumbs.innerHTML = '';
      const root = document.createElement('button');
      root.textContent = 'root';
      root.onclick = function () { void load(''); };
      elements.crumbs.appendChild(root);

      const plain = trimTrailingSlash(prefix);
      const parts = plain ? plain.split('/') : [];
      let current = '';
      for (const part of parts) {
        const separator = document.createElement('span');
        separator.textContent = '/';
        elements.crumbs.appendChild(separator);

        current += part + '/';
        const button = document.createElement('button');
        button.textContent = part;
        const target = current;
        button.onclick = function () { void load(target); };
        elements.crumbs.appendChild(button);
      }
    }

    function setViewMode(mode) {
      state.viewMode = mode;
      localStorage.setItem(viewStorageKey, mode);
      elements.tableView.classList.toggle('hidden', mode !== 'table');
      elements.iconView.classList.toggle('hidden', mode !== 'icon');
      elements.tableViewButton.classList.toggle('active', mode === 'table');
      elements.iconViewButton.classList.toggle('active', mode === 'icon');
    }

    async function loadSession() {
      const data = await api('/api/session');
      state.session = data;
      elements.who.textContent = '已登录：' + data.email;
    }

    async function load(prefix) {
      const nextPrefix = prefix == null ? state.prefix : prefix;
      state.prefix = nextPrefix;
      renderCrumbs(nextPrefix);
      elements.pathView.textContent = nextPrefix ? '/' + nextPrefix : '/';
      setStatus('正在加载目录…');
      try {
        const data = await api('/api/list?prefix=' + encodeURIComponent(nextPrefix));
        renderAll(data);
        elements.folderCount.textContent = numberFormat.format(data.folders.length);
        elements.fileCount.textContent = numberFormat.format(data.files.length);
        setStatus('已加载 ' + numberFormat.format(data.folders.length + data.files.length) + ' 个项目', 'success');
      } catch (error) {
        setStatus(error.message || '目录加载失败', 'error');
      }
    }

    function actionButton(label, action, kind) {
      return '<button class="btn small' + (kind ? ' ' + kind : '') + '" type="button" data-action="' + action + '">' + label + '</button>';
    }

    function renderAll(data) {
      renderRows(data);
      renderCards(data);
      setViewMode(state.viewMode);
    }

    function renderRows(data) {
      if (!data.folders.length && !data.files.length) {
        elements.rows.innerHTML = '<tr><td colspan="6" class="empty">当前目录为空，可以直接上传文件或文件夹。</td></tr>';
        return;
      }

      const html = [];
      for (const folder of data.folders) {
        html.push(
          '<tr class="row" data-kind="folder" data-path="' + escapeHtml(folder.path) + '">' +
            '<td class="name"><span class="name-text">📁 ' + escapeHtml(folder.name) + '</span></td>' +
            '<td>文件夹</td><td>-</td><td>-</td><td>-</td>' +
            '<td><div class="row-actions">' +
              actionButton('进入', 'enter') +
              actionButton('移动/重命名', 'move') +
              actionButton('分享', 'share') +
              actionButton('删除', 'delete', 'danger') +
            '</div></td>' +
          '</tr>'
        );
      }
      for (const file of data.files) {
        const mediaType = getMediaType(file.name);
        const icon = mediaType === 'video' ? '🎬' : mediaType === 'audio' ? '🎵' : '📄';
        const playBtn = mediaType ? actionButton('播放', 'play') : '';
        html.push(
          '<tr class="row" data-kind="file" data-path="' + escapeHtml(file.path) + '">' +
            '<td class="name"><span class="name-text">' + icon + ' ' + escapeHtml(file.name) + '</span></td>' +
            '<td>文件</td>' +
            '<td>' + formatBytes(file.size) + '</td>' +
            '<td>' + escapeHtml(formatTime(file.uploaded)) + '</td>' +
            '<td>' + escapeHtml(file.contentType || '-') + '</td>' +
            '<td><div class="row-actions">' +
              playBtn +
              actionButton('详情', 'detail') +
              actionButton('移动/重命名', 'move') +
              actionButton('分享', 'share') +
              actionButton('删除', 'delete', 'danger') +
            '</div></td>' +
          '</tr>'
        );
      }
      elements.rows.innerHTML = html.join('');
    }

    function renderCards(data) {
      if (!data.folders.length && !data.files.length) {
        elements.iconView.innerHTML = '<div class="info">当前目录为空，可以先创建文件夹或上传文件。</div>';
        return;
      }

      const html = [];
      for (const folder of data.folders) {
        html.push(
          '<div class="card-item" data-kind="folder" data-path="' + escapeHtml(folder.path) + '">' +
            '<div class="card-item-top"><div class="card-icon">📁</div>' + actionButton('进入', 'enter') + '</div>' +
            '<div class="card-name">' + escapeHtml(folder.name) + '</div>' +
            '<div class="card-meta"><div>文件夹</div><div class="row-actions">' +
              actionButton('移动/重命名', 'move') +
              actionButton('分享', 'share') +
              actionButton('删除', 'delete', 'danger') +
            '</div></div>' +
          '</div>'
        );
      }
      for (const file of data.files) {
        const mediaType = getMediaType(file.name);
        const icon = mediaType === 'video' ? '🎬' : mediaType === 'audio' ? '🎵' : '📄';
        const playBtn = mediaType ? actionButton('播放', 'play') : '';
        html.push(
          '<div class="card-item" data-kind="file" data-path="' + escapeHtml(file.path) + '">' +
            '<div class="card-item-top"><div class="card-icon">' + icon + '</div><div class="row-actions">' + playBtn + actionButton('详情', 'detail') + '</div></div>' +
            '<div class="card-name">' + escapeHtml(file.name) + '</div>' +
            '<div class="card-meta"><div>' + formatBytes(file.size) + '</div><div>' + escapeHtml(formatTime(file.uploaded)) + '</div><div class="row-actions">' +
              actionButton('移动/重命名', 'move') +
              actionButton('分享', 'share') +
              actionButton('删除', 'delete', 'danger') +
            '</div></div>' +
          '</div>'
        );
      }
      elements.iconView.innerHTML = html.join('');
    }

    function renderImportTasks(tasks) {
      state.importTasks = tasks;
      if (!tasks.length) {
        elements.importTasks.innerHTML = '<div class="empty">暂无导入任务</div>';
        return;
      }

      const html = [];
      for (const task of tasks) {
        const title = task.resolvedFileName || task.requestedFileName || task.targetPath || task.sourceUrl;
        const target = task.targetPath || ((task.directory ? '/' + task.directory : '/') + (task.requestedFileName || '自动命名'));
        const meta = [
          '目标：' + target,
          '尝试：' + numberFormat.format(task.attempts),
          '更新时间：' + formatTime(task.updatedAt)
        ];
        if (task.contentLength != null) meta.push('大小：' + formatBytes(task.contentLength));
        if (task.contentType) meta.push('MIME：' + task.contentType);

        html.push(
          '<div class="task-item">' +
            '<div class="task-item-head">' +
              '<button class="task-title-btn" type="button" data-task-id="' + escapeHtml(task.id) + '" title="' + escapeHtml(title) + '">' +
                '<strong class="task-title">' + escapeHtml(title) + '</strong>' +
              '</button>' +
              '<span class="task-badge ' + escapeHtml(task.status === 'succeeded' ? 'success' : task.status === 'failed' ? 'error' : task.status === 'running' ? 'running' : 'queued') + '">' + escapeHtml(taskLabels[task.status] || task.status) + '</span>' +
            '</div>' +
            '<div class="task-meta">' + meta.map(function (line) { return '<div title="' + escapeHtml(line) + '">' + escapeHtml(line) + '</div>'; }).join('') + '</div>' +
            (task.error ? '<div class="task-error" title="' + escapeHtml(task.error) + '">' + escapeHtml(task.error) + '</div>' : '') +
          '</div>'
        );
      }
      elements.importTasks.innerHTML = html.join('');
    }

    function showImportTask(taskId) {
      const task = state.importTasks.find(function (item) { return item.id === taskId; });
      if (!task) return;
      const title = task.resolvedFileName || task.requestedFileName || task.targetPath || task.sourceUrl;
      const target = task.targetPath || ((task.directory ? '/' + task.directory : '/') + (task.requestedFileName || '自动命名'));
      const items = [
        ['任务 ID', task.id],
        ['标题', title],
        ['状态', taskLabels[task.status] || task.status],
        ['源地址', task.sourceUrl],
        ['目标路径', target],
        ['目标目录', task.directory || '/'],
        ['请求文件名', task.requestedFileName || '-'],
        ['解析文件名', task.resolvedFileName || '-'],
        ['覆盖同名', task.overwrite ? '是' : '否'],
        ['尝试次数', numberFormat.format(task.attempts)],
        ['请求人', task.requestedBy || '-'],
        ['大小', task.contentLength == null ? '-' : formatBytes(task.contentLength)],
        ['MIME', task.contentType || '-'],
        ['创建时间', formatTime(task.createdAt)],
        ['开始时间', formatTime(task.startedAt)],
        ['完成时间', formatTime(task.finishedAt)],
        ['更新时间', formatTime(task.updatedAt)],
        ['错误信息', task.error || '-']
      ];
      elements.importTaskBody.innerHTML = items.map(function (item) {
        return '<div class="info"><div class="muted">' + escapeHtml(item[0]) + '</div><div class="mono" title="' + escapeHtml(String(item[1])) + '">' + escapeHtml(String(item[1])) + '</div></div>';
      }).join('');
      elements.importTaskDialog.showModal();
    }

    async function loadImportTasks(silent) {
      try {
        const data = await api('/api/import-tasks?limit=8');
        renderImportTasks(data.tasks || []);
      } catch (error) {
        elements.importTasks.innerHTML = '<div class="info">' + escapeHtml(error.message || '\u52a0\u8f7d\u5bfc\u5165\u4efb\u52a1\u5931\u8d25') + '</div>';
        if (!silent) setStatus(error.message || '\u52a0\u8f7d\u5bfc\u5165\u4efb\u52a1\u5931\u8d25', 'error');
        throw error;
      }
    }

    function renderTrashItems(items) {
      state.trashItems = items;
      if (!items.length) {
        elements.trashList.innerHTML = '<div class="empty">\u56de\u6536\u7ad9\u4e3a\u7a7a</div>';
        return;
      }

      const html = [];
      for (const item of items) {
        const title = item.originalPath.split('/').filter(Boolean).pop() || item.originalPath;
        const meta = [
          '\u539f\u8def\u5f84\uff1a' + item.originalPath,
          '\u56de\u6536\u7ad9\u4e3a\u7a7a' + formatTime(item.deletedAt),
          '\u5220\u9664\u4eba\uff1a' + item.deletedBy,
          item.kind === 'folder' ? '\u56de\u6536\u7ad9\u4e3a\u7a7a' + numberFormat.format(item.itemCount) : 'MIME\uff1a' + (item.contentType || '-'),
          '\u5927\u5c0f\uff1a' + formatBytes(item.totalSize)
        ];
        html.push(
          '<div class="task-item">' +
            '<div class="task-item-head">' +
              '<div class="task-title" title="' + escapeHtml(item.originalPath) + '">' + escapeHtml(title) + '</div>' +
              '<span class="task-badge error">' + (item.kind === 'folder' ? '\u6587\u4ef6\u5939' : '\u6587\u4ef6') + '</span>' +
            '</div>' +
            '<div class="task-meta">' + meta.map(function (line) { return '<div title="' + escapeHtml(line) + '">' + escapeHtml(line) + '</div>'; }).join('') + '</div>' +
            '<div class="row-actions">' +
              '<button class="btn small" type="button" data-trash-restore="' + escapeHtml(item.id) + '">\u6062\u590d</button>' +
              '<button class="btn small danger" type="button" data-trash-delete="' + escapeHtml(item.id) + '">\u5f7b\u5e95\u5220\u9664</button>' +
            '</div>' +
          '</div>'
        );
      }
      elements.trashList.innerHTML = html.join('');
    }

    async function loadTrash(silent) {
      try {
        const data = await api('/api/trash?limit=50');
        renderTrashItems(data.items || []);
      } catch (error) {
        elements.trashList.innerHTML = '<div class="info">' + escapeHtml(error.message || '\u52a0\u8f7d\u56de\u6536\u7ad9\u5931\u8d25') + '</div>';
        if (!silent) setStatus(error.message || '\u52a0\u8f7d\u56de\u6536\u7ad9\u5931\u8d25', 'error');
        throw error;
      }
    }

    async function restoreTrash(itemId) {
      await api('/api/trash/restore', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ itemId: itemId })
      });
      setStatus('\u5df2\u4ece\u56de\u6536\u7ad9\u6062\u590d\u5bf9\u8c61', 'success');
      await Promise.all([load(state.prefix), loadTrash(true)]);
    }

    async function deleteTrashPermanently(itemId) {
      const ok = window.confirm('\u786e\u5b9a\u5f7b\u5e95\u5220\u9664\u8fd9\u4e2a\u56de\u6536\u7ad9\u6761\u76ee\u5417\uff1f\u6b64\u64cd\u4f5c\u4e0d\u53ef\u6062\u590d\u3002');
      if (!ok) return;
      await api('/api/trash?itemId=' + encodeURIComponent(itemId), { method: 'DELETE' });
      setStatus('\u5df2\u5f7b\u5e95\u5220\u9664\u56de\u6536\u7ad9\u6761\u76ee', 'success');
      await loadTrash(true);
    }

    async function showDetail(path) {
      const data = await api('/api/object?path=' + encodeURIComponent(path));
      state.detail = { path: path, kind: data.kind };
      const items = [
        ['路径', data.path],
        ['名称', data.name],
        ['类型', data.kind === 'folder' ? '文件夹' : '文件'],
        ['大小', data.size == null ? '-' : formatBytes(data.size)],
        ['上传时间', formatTime(data.uploaded)],
        ['MIME', data.contentType || '-'],
        ['ETag', data.etag || '-']
      ];
      if (data.childCount != null) items.push(['目录项目数', String(data.childCount)]);
      if (data.totalSize != null) items.push(['目录总大小', formatBytes(data.totalSize)]);
      elements.detailBody.innerHTML = items.map(function (item) {
        return '<div class="info"><div class="muted">' + escapeHtml(item[0]) + '</div><div class="mono">' + escapeHtml(String(item[1])) + '</div></div>';
      }).join('');

      const disabled = data.kind !== 'file';
      elements.openFile.disabled = disabled;
      elements.downloadFile.disabled = disabled;
      elements.detailDialog.showModal();
    }

    async function upload(files) {
      if (!files.length) return;
      const formData = new FormData();
      formData.append('basePath', state.prefix);
      for (const file of files) {
        formData.append('files', file, file.name);
        formData.append('paths', file.webkitRelativePath || file.name);
      }

      setStatus('正在上传 ' + numberFormat.format(files.length) + ' 个文件…');
      try {
        const out = await api('/api/upload', { method: 'POST', body: formData });
        setStatus('上传完成：' + numberFormat.format(out.uploaded) + ' 个文件', 'success');
        await load(state.prefix);
      } catch (error) {
        setStatus(error.message || '上传失败', 'error');
      }
    }

    async function promptCreateFolder() {
      const name = window.prompt('输入新文件夹名称');
      if (!name) return;
      const path = ensureFolderPath(state.prefix + name);
      const out = await api('/api/folder', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: path })
      });
      setStatus('文件夹已创建：' + out.path, 'success');
      await load(state.prefix);
    }

    async function promptImportUrl() {
      const url = window.prompt('输入远程文件 URL（仅支持 http/https）');
      if (!url) return;
      const fileName = window.prompt('可选：自定义文件名（留空则自动推断）', '') || '';
      const overwrite = window.confirm('如果同名文件已存在，是否覆盖？');
      const out = await api('/api/import-url', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: url, directory: state.prefix, fileName: fileName, overwrite: overwrite })
      });
      setStatus('URL 导入任务已创建：' + out.id, 'success');
      await loadImportTasks(true);
    }

    function openShare(target) {
      state.share = target;
      elements.shareTarget.textContent = '目标：' + target.path;
      elements.shareLink.value = '';
      elements.shareDialog.showModal();
      void loadShares().catch(function (error) {
        setStatus(error.message || '加载分享失败', 'error');
      });
    }

    async function createShareLink() {
      if (!state.share) return;
      const out = await api('/api/share', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          path: state.share.path,
          kind: state.share.kind,
          expiresInDays: Number(elements.shareExpiry.value)
        })
      });
      elements.shareLink.value = out.url;
      setStatus('分享链接已生成', 'success');
      await loadShares();
    }

    async function loadShares() {
      if (!state.share) return;
      elements.shareList.innerHTML = '<div class="info">正在加载已有分享…</div>';
      const data = await api('/api/shares?kind=' + encodeURIComponent(state.share.kind) + '&path=' + encodeURIComponent(state.share.path));
      if (!data.shares.length) {
        elements.shareList.innerHTML = '<div class="info">当前目标还没有有效分享。</div>';
        return;
      }
      elements.shareList.innerHTML = data.shares.map(function (item) {
        return '<div class="share-item">' +
          '<div class="share-item-head"><strong class="mono">' + escapeHtml(item.code) + '</strong><button class="btn small danger" type="button" data-revoke="' + escapeHtml(item.code) + '">撤销</button></div>' +
          '<div class="share-meta"><div>链接：<span class="mono">' + escapeHtml(item.url) + '</span></div><div>创建时间：' + escapeHtml(formatTime(item.createdAt)) + '</div><div>过期时间：' + escapeHtml(item.expiresAt ? formatTime(item.expiresAt) : '永久有效') + '</div></div>' +
        '</div>';
      }).join('');
    }

    async function revokeShare(code) {
      await api('/api/share?code=' + encodeURIComponent(code), { method: 'DELETE' });
      setStatus('分享已撤销', 'success');
      await loadShares();
    }

    async function moveTarget(target) {
      const message = target.kind === 'folder'
        ? '输入新的完整文件夹路径（示例：docs/archive/）'
        : '输入新的完整文件路径（示例：docs/report.pdf）';
      const next = window.prompt(message, target.path);
      if (!next) return;
      const targetPath = target.kind === 'folder' ? ensureFolderPath(next) : normalizeInputPath(next);
      if (!targetPath) return;

      const out = await api('/api/move', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: target.kind, path: target.path, targetPath: targetPath })
      });
      setStatus('已移动 ' + numberFormat.format(out.moved) + ' 个对象，更新 ' + numberFormat.format(out.updatedShares) + ' 个分享', 'success');

      if (state.detail && state.detail.path === target.path) {
        state.detail = { path: targetPath, kind: target.kind };
        elements.detailDialog.close();
      }

      if (target.kind === 'folder' && state.prefix.startsWith(target.path)) {
        await load(parentDir(targetPath));
      } else {
        await load(state.prefix);
      }
    }

    async function deleteTarget(target) {
      const noun = target.kind === 'folder' ? '文件夹' : '文件';
      const ok = window.confirm('确定删除' + noun + ' “' + target.path + '” 吗？此操作不可恢复，并会撤销相关分享。');
      if (!ok) return;

      const out = await api('/api/object?path=' + encodeURIComponent(target.path), { method: 'DELETE' });
      setStatus('已删除 ' + numberFormat.format(out.deleted) + ' 个对象，撤销 ' + numberFormat.format(out.revokedShares) + ' 个分享', 'success');
      if (state.detail && state.detail.path === target.path) elements.detailDialog.close();
      await load(state.prefix);
    }

    function openPlayer(path) {
      const name = path.split('/').pop() || path;
      const mediaType = getMediaType(name);
      if (!mediaType) return;
      const url = fileUrl(path, false);
      elements.playerTitle.textContent = (mediaType === 'video' ? '🎬 ' : '🎵 ') + name;
      elements.playerContainer.innerHTML = '';
      if (mediaType === 'video') {
        elements.playerContainer.innerHTML = '<video controls src="' + escapeHtml(url) + '" style="width:100%;max-height:70vh"></video>';
      } else {
        elements.playerContainer.innerHTML = '<div class="audio-player"><div class="audio-icon">🎵</div><audio controls src="' + escapeHtml(url) + '" style="width:100%"></audio></div>';
      }
      elements.playerDownload.href = fileUrl(path, true);
      elements.playerDownload.download = name;
      elements.playerDialog.showModal();
    }

    function handleItemAction(action, item) {
      if (action === 'enter') { void load(item.path); return; }
      if (action === 'play') { openPlayer(item.path); return; }
      if (action === 'detail') { void showDetail(item.path).catch(function (error) { setStatus(error.message || '加载详情失败', 'error'); }); return; }
      if (action === 'share') { openShare(item); return; }
      if (action === 'move') { void moveTarget(item).catch(function (error) { setStatus(error.message || '移动失败', 'error'); }); return; }
      if (action === 'delete') { void deleteTarget(item).catch(function (error) { setStatus(error.message || '删除失败', 'error'); }); }
    }

    if (elements.themeToggle) {
      elements.themeToggle.onclick = function () { toggleTheme(); };
    }

    elements.refresh.onclick = function () {
      void Promise.all([load(state.prefix), loadImportTasks(true).catch(function () { return null; })]);
    };
    elements.newFolderButton.onclick = function () {
      void promptCreateFolder().catch(function (error) { setStatus(error.message || '创建文件夹失败', 'error'); });
    };
    elements.importUrlButton.onclick = function () {
      void promptImportUrl().catch(function (error) { setStatus(error.message || 'URL 导入失败', 'error'); });
    };
    elements.refreshImports.onclick = function () {
      void loadImportTasks(false).catch(function () { return null; });
    };
    elements.importTasks.onclick = function (event) {
      const button = event.target.closest('[data-task-id]');
      if (!button) return;
      showImportTask(button.dataset.taskId);
    };
    elements.trashList.onclick = function (event) {
      const restoreButton = event.target.closest('[data-trash-restore]');
      if (restoreButton) {
        void restoreTrash(restoreButton.dataset.trashRestore).catch(function (error) { setStatus(error.message || '\u6062\u590d\u5931\u8d25', 'error'); });
        return;
      }
      const deleteButton = event.target.closest('[data-trash-delete]');
      if (deleteButton) {
        void deleteTrashPermanently(deleteButton.dataset.trashDelete).catch(function (error) { setStatus(error.message || '\u5f7b\u5e95\u5220\u9664\u5931\u8d25', 'error'); });
      }
    };
    elements.tableViewButton.onclick = function () { setViewMode('table'); };
    elements.iconViewButton.onclick = function () { setViewMode('icon'); };
    elements.closeDetail.onclick = function () { elements.detailDialog.close(); };
    elements.closeShare.onclick = function () { elements.shareDialog.close(); };
    elements.closePlayer.onclick = function () {
      elements.playerContainer.innerHTML = '';
      elements.playerDialog.close();
    };
    elements.closeImportTask.onclick = function () {
      elements.importTaskDialog.close();
    };
    elements.refreshTrash.onclick = function () {
      void loadTrash(false).catch(function () { return null; });
    };
    elements.closeTrash.onclick = function () {
      elements.trashDialog.close();
    };
    elements.openFile.onclick = function () {
      if (!state.detail) return;
      if (getMediaType(state.detail.path)) {
        openPlayer(state.detail.path);
      } else {
        window.open(fileUrl(state.detail.path, false), '_blank', 'noopener');
      }
    };
    elements.downloadFile.onclick = function () {
      if (state.detail) window.open(fileUrl(state.detail.path, true), '_blank', 'noopener');
    };
    elements.moveFromDetail.onclick = function () {
      if (state.detail) void moveTarget(state.detail).catch(function (error) { setStatus(error.message || '移动失败', 'error'); });
    };
    elements.shareFromDetail.onclick = function () {
      if (state.detail) openShare(state.detail);
    };
    elements.deleteFromDetail.onclick = function () {
      if (state.detail) void deleteTarget(state.detail).catch(function (error) { setStatus(error.message || '删除失败', 'error'); });
    };
    elements.createShare.onclick = function () {
      void createShareLink().catch(function (error) { setStatus(error.message || '生成分享失败', 'error'); });
    };
    elements.refreshShares.onclick = function () {
      void loadShares().catch(function (error) { setStatus(error.message || '加载分享失败', 'error'); });
    };
    elements.copyShare.onclick = async function () {
      if (!elements.shareLink.value) return;
      await navigator.clipboard.writeText(elements.shareLink.value);
      setStatus('分享链接已复制', 'success');
    };

    elements.pickFiles.addEventListener('change', async function () {
      const files = Array.from(elements.pickFiles.files || []);
      await upload(files);
      elements.pickFiles.value = '';
    });
    elements.pickFolder.addEventListener('change', async function () {
      const files = Array.from(elements.pickFolder.files || []);
      await upload(files);
      elements.pickFolder.value = '';
    });

    ['dragenter', 'dragover'].forEach(function (name) {
      elements.dropzone.addEventListener(name, function (event) {
        event.preventDefault();
        elements.dropzone.classList.add('active');
      });
    });
    ['dragleave', 'drop'].forEach(function (name) {
      elements.dropzone.addEventListener(name, function (event) {
        event.preventDefault();
        elements.dropzone.classList.remove('active');
      });
    });
    elements.dropzone.addEventListener('drop', async function (event) {
      const files = [];
      for (const item of (event.dataTransfer?.items || [])) {
        if (item.kind !== 'file') continue;
        const file = item.getAsFile();
        if (file) files.push(file);
      }
      await upload(files);
    });

    elements.rows.addEventListener('click', function (event) {
      const row = event.target.closest('tr[data-path]');
      if (!row) return;
      const item = { path: row.dataset.path, kind: row.dataset.kind };
      const button = event.target.closest('[data-action]');
      if (button) {
        handleItemAction(button.dataset.action, item);
        return;
      }
      if (item.kind === 'folder') {
        void load(item.path);
      } else {
        void showDetail(item.path).catch(function (error) { setStatus(error.message || '加载详情失败', 'error'); });
      }
    });

    elements.iconView.addEventListener('click', function (event) {
      const card = event.target.closest('[data-path]');
      if (!card) return;
      const item = { path: card.dataset.path, kind: card.dataset.kind };
      const button = event.target.closest('[data-action]');
      if (button) {
        handleItemAction(button.dataset.action, item);
        return;
      }
      if (item.kind === 'folder') {
        void load(item.path);
      } else {
        void showDetail(item.path).catch(function (error) { setStatus(error.message || '加载详情失败', 'error'); });
      }
    });

    elements.shareList.addEventListener('click', function (event) {
      const button = event.target.closest('[data-revoke]');
      if (!button) return;
      void revokeShare(button.dataset.revoke).catch(function (error) { setStatus(error.message || '撤销分享失败', 'error'); });
    });

    applyTheme(state.theme, false);
    setViewMode(state.viewMode === 'icon' ? 'icon' : 'table');
    window.setInterval(function () {
      void loadImportTasks(true).catch(function () { return null; });
    }, 15000);

    Promise.resolve()
      .then(loadSession)
      .then(async function () {
        await Promise.all([load(''), loadImportTasks(true).catch(function () { return null; })]);
      })
      .catch(function (error) {
        setStatus(error.message || '初始化失败', 'error');
      });
