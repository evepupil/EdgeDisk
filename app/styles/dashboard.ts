export const dashboardStyles = `
  #dashboard-page { min-height: 100vh; }
  .app-frame { min-width: 0; min-height: 100vh; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); background: var(--background); }
  .topbar { display: grid; grid-template-columns: minmax(160px, 220px) minmax(220px, 1fr) auto; align-items: center; gap: 16px; padding: 12px 16px; border-bottom: 1px solid var(--border); background: var(--background); }
  .search-field { position: relative; display: block; }
  .search-field .icon { position: absolute; z-index: 1; left: 11px; top: 50%; color: var(--muted-foreground); pointer-events: none; transform: translateY(-50%); }
  .search-field input { width: 100%; padding-left: 36px; }
  .account { display: flex; min-width: 0; align-items: center; gap: 10px; }
  .account-copy { display: grid; min-width: 0; }
  .account-copy strong { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .account-copy span { color: var(--muted-foreground); font-size: 12px; }

  .workspace { display: grid; grid-template-columns: minmax(170px, 220px) minmax(0, 1fr); min-height: max(650px, calc(100vh - 58px)); }
  .sidebar { display: flex; min-width: 0; flex-direction: column; gap: 4px; padding: 14px 10px; border-right: 1px solid var(--border); }
  .nav-button { width: 100%; justify-content: flex-start; border-color: transparent; background: transparent; }
  .nav-count { margin-left: auto; color: var(--muted-foreground); font-size: 12px; }
  .nav-button.active .nav-count { color: color-mix(in srgb, var(--primary-foreground) 58%, transparent); }
  .sidebar-spacer { flex: 1; min-height: 24px; }
  .storage-block { padding: 10px 8px 4px; border-top: 1px solid var(--border); }
  .storage-block > span { display: block; }
  .storage-track { height: 5px; margin: 8px 0; overflow: hidden; border-radius: 3px; background: var(--muted); }
  .storage-track span { display: block; width: 38%; height: 100%; background: var(--primary); }

  .main-area { min-width: 0; padding: 18px; }
  .app-panel { min-width: 0; }
  .page-heading, .file-toolbar, .selection-bar, .selection-actions { display: flex; min-width: 0; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
  .page-heading { margin-bottom: 18px; }
  .heading-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 10px; }
  .file-picker { cursor: pointer; }
  .file-picker input { display: none; }

  .file-toolbar { padding: 10px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
  .compact-field { display: flex; align-items: center; gap: 5px; }
  .compact-field > .icon { display: none; }
  .compact-field select { min-height: 28px; }
  .selection-bar { margin-top: 10px; padding: 8px 10px; border-radius: 6px; color: var(--accent-foreground); background: var(--accent); }
  .selection-actions { justify-content: flex-end; gap: 10px; }

  .content-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; margin-top: 12px; min-width: 0; }
  .content-grid.with-detail { grid-template-columns: minmax(0, 1fr) minmax(220px, 290px); }
  .file-surface { position: relative; min-width: 0; }
  .drop-overlay { position: absolute; z-index: 25; inset: 0; display: none; min-height: 280px; place-items: center; align-content: center; gap: 10px; border: 2px dashed var(--primary); border-radius: 6px; color: var(--primary); background: color-mix(in srgb, var(--accent) 92%, transparent); pointer-events: none; }
  .file-surface.dragging .drop-overlay { display: grid; }
  .file-row { cursor: pointer; }

  .file-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(145px, 1fr)); gap: 8px; }
  .file-card { display: grid; min-width: 0; gap: 10px; padding: 12px; border: 1px solid var(--border); border-radius: 6px; color: var(--foreground); background: transparent; cursor: pointer; }
  .file-card:hover, .file-card.selected { background: var(--accent); }
  .file-card-head { display: flex; justify-content: space-between; gap: 8px; }
  .file-card-icon { display: inline-flex; width: 28px; height: 28px; align-items: center; justify-content: center; color: var(--muted-foreground); }
  .file-card-icon.folder { color: var(--series-1); }
  .file-card-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .file-card-meta { color: var(--muted-foreground); font-size: 12px; }

  .detail-panel { align-self: start; overflow: hidden; border-radius: var(--radius-xl); color: var(--card-foreground); background: var(--card); }
  .detail-head, .detail-body { padding: 14px; }
  .detail-head { border-bottom: 1px solid var(--border); }
  .detail-title { display: flex; min-width: 0; align-items: center; gap: 10px; }
  .detail-preview { display: grid; min-height: 120px; margin-bottom: 12px; place-items: center; border-radius: 6px; color: var(--muted-foreground); background: var(--muted); }
  .detail-preview .icon, .detail-preview svg { width: 42px; height: 42px; }
  .detail-name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .detail-list { margin: 0; padding: 0; }
  .detail-list div { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 8px; padding: 7px 0; border-bottom: 1px solid var(--border); }
  .detail-list dt { color: var(--muted-foreground); }
  .detail-list dd { min-width: 0; margin: 0; overflow-wrap: anywhere; }
  .detail-actions { display: grid; gap: 6px; margin-top: 14px; }

  .activity-bar { display: grid; gap: 10px; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border); }
  .activity-head { display: flex; min-width: 0; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
  .activity-actions { display: flex; flex: none; align-items: center; gap: 6px; }
  .activity-copy { display: flex; min-width: 0; align-items: center; gap: 10px; }
  .activity-copy > div { display: grid; min-width: 0; }
  .activity-copy span { color: var(--muted-foreground); font-size: 12px; }
  .activity-progress { display: flex; align-items: center; gap: 10px; }
  .activity-percent { flex: none; min-width: 40px; color: var(--muted-foreground); font-size: 12px; font-variant-numeric: tabular-nums; text-align: right; }
  .progress-track { width: min(180px, 100%); height: 5px; overflow: hidden; border-radius: 3px; background: var(--muted); }
  .progress-track span { display: block; width: 0; height: 100%; background: var(--primary); transition: width .2s ease; }
  .activity-progress .progress-track { flex: 1; width: auto; }

  .upload-list { display: grid; gap: 6px; max-height: 170px; overflow-y: auto; }
  .upload-row { display: grid; grid-template-columns: minmax(0, 1fr) 90px 76px; align-items: center; gap: 10px; font-size: 12px; }
  .upload-row-name { display: flex; min-width: 0; align-items: center; gap: 6px; }
  .upload-row-name span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .upload-row-name .icon { flex: none; }
  .upload-row-bar { height: 4px; overflow: hidden; border-radius: 2px; background: var(--muted); }
  .upload-row-bar span { display: block; width: 0; height: 100%; background: var(--primary); transition: width .2s ease; }
  .upload-row-meta { color: var(--muted-foreground); font-variant-numeric: tabular-nums; text-align: right; }
  .upload-row.uploading .upload-row-name .icon { animation: edgedisk-spin 1s linear infinite; }
  .upload-row.failed .upload-row-meta, .upload-row.failed .upload-row-name .icon { color: var(--destructive); }
  .upload-row.failed .upload-row-bar span { background: var(--destructive); }
  .upload-row.canceled { opacity: .55; }

  .data-list { display: grid; border-top: 1px solid var(--border); }
  .data-list.compact { max-height: 260px; overflow: auto; }
  .data-row { display: grid; grid-template-columns: minmax(180px, 1.5fr) minmax(150px, 1fr) 130px 160px auto; align-items: center; gap: 12px; min-width: 0; padding: 10px 0; border-bottom: 1px solid var(--border); }
  .data-row-main { display: grid; min-width: 0; gap: 2px; }
  .data-row-main strong, .data-row-main span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .data-row-main span, .data-cell-muted { color: var(--muted-foreground); font-size: 12px; }
  .data-row-actions { display: flex; justify-content: flex-end; gap: 6px; }
  .status-pill, .share-badge { display: inline-flex; width: max-content; min-height: 22px; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px; color: var(--accent-foreground); background: var(--accent); font-size: 12px; font-weight: 500; }
  .status-pill.success { color: var(--foreground); background: transparent; }
  .status-pill.error { color: var(--destructive); background: transparent; }
  .status-pill.running .icon { animation: edgedisk-spin 1s linear infinite; }
  .share-data-row { grid-template-columns: minmax(0, 1fr) auto auto; }
  .share-manage-row { grid-template-columns: 26px minmax(0, 1.6fr) 150px 160px auto; }
  .share-pick { display: flex; align-items: center; }

  .search-scope { flex: none; padding: 2px 8px; border: 1px solid var(--border); border-radius: 999px; color: var(--muted-foreground); background: transparent; font-size: 11px; cursor: pointer; }
  .search-scope[aria-pressed="true"] { border-color: transparent; color: var(--accent-foreground); background: var(--accent); }
  .search-result-dir { color: var(--muted-foreground); font-size: 12px; }
  @keyframes edgedisk-spin { to { transform: rotate(360deg); } }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
  }

  @media (max-width: 820px) {
    .topbar { grid-template-columns: 1fr auto; }
    .topbar .search-field { grid-row: 2; grid-column: 1 / -1; }
    .content-grid.with-detail { grid-template-columns: minmax(0, 1fr); }
    .detail-panel { order: -1; }
    .hide-tablet, .time-cell { display: none; }
    .data-row { grid-template-columns: minmax(180px, 1fr) 120px auto; }
    .share-manage-row { grid-template-columns: 26px minmax(0, 1fr) 160px auto; }
  }

  @media (max-width: 620px) {
    .workspace { grid-template-columns: minmax(0, 1fr); min-height: 0; }
    .sidebar { flex-direction: row; overflow-x: auto; border-right: 0; border-bottom: 1px solid var(--border); }
    .sidebar-spacer, .storage-block { display: none; }
    .nav-button { width: auto; flex: 0 0 auto; white-space: nowrap; }
    .nav-count { margin-left: 4px; }
    .main-area { padding: 14px 10px; }
    .topbar { padding: 10px; }
    .account-copy { display: none; }
    .page-heading { align-items: flex-start; }
    .heading-actions { justify-content: flex-start; }
    .hide-mobile, .size-cell { display: none; }
    .selection-actions { width: 100%; justify-content: flex-start; }
    .data-row { grid-template-columns: minmax(0, 1fr) auto; }
    .share-manage-row { grid-template-columns: 26px minmax(0, 1fr) auto; }
    .activity-head { align-items: flex-start; }
    .upload-row { grid-template-columns: minmax(0, 1fr) 70px; }
    .upload-row-bar { display: none; }
  }
`
