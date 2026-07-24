export const dashboardStyles = `
  #dashboard-page { min-height: 100vh; }
  .app-frame { min-height: 100vh; background: var(--bg); }
  .topbar { position: sticky; z-index: 40; top: 0; display: grid; grid-template-columns: 220px minmax(240px, 560px) 1fr; align-items: center; gap: 18px; min-height: 62px; padding: 10px 18px; border-bottom: 1px solid var(--line); background: var(--surface); }
  .search-field { position: relative; display: block; max-width: 560px; }
  .search-field .icon { position: absolute; z-index: 1; left: 11px; top: 10px; color: var(--muted); pointer-events: none; }
  .search-field input { width: 100%; padding-left: 38px; background: var(--bg); }
  .account-area { display: flex; min-width: 0; align-items: center; justify-content: flex-end; gap: 10px; }
  .account-copy { display: grid; min-width: 0; justify-items: end; }
  .account-copy strong { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .account-copy span { color: var(--muted); font-size: 12px; }

  .workspace { display: grid; grid-template-columns: 220px minmax(0, 1fr); min-height: calc(100vh - 62px); }
  .sidebar { position: sticky; top: 62px; display: flex; height: calc(100vh - 62px); flex-direction: column; gap: 4px; padding: 14px 10px; border-right: 1px solid var(--line); background: var(--surface); }
  .nav-button { display: flex; width: 100%; min-height: 40px; align-items: center; gap: 10px; padding: 0 11px; border-color: transparent; border-radius: 6px; text-align: left; }
  .nav-button.active { color: var(--primary); background: var(--primary-soft); }
  .nav-count { margin-left: auto; color: var(--muted); font-size: 12px; }
  .sidebar-spacer { flex: 1; }
  .sidebar-note { display: flex; align-items: flex-start; gap: 9px; padding: 12px 9px 4px; border-top: 1px solid var(--line); color: var(--muted); }
  .sidebar-note div { display: grid; gap: 2px; }
  .sidebar-note strong { color: var(--text); font-size: 12px; }
  .sidebar-note span { font-size: 12px; }

  .main-area { min-width: 0; padding: 22px; }
  .app-panel { width: min(1440px, 100%); margin: 0 auto; }
  .page-heading { display: flex; min-width: 0; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 18px; }
  .heading-actions, .file-toolbar, .selection-bar, .selection-actions, .activity-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .heading-actions { justify-content: flex-end; }
  .file-picker { cursor: pointer; }
  .file-picker input { display: none; }

  .file-toolbar { justify-content: space-between; min-height: 50px; padding: 7px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  .compact-field { display: flex; align-items: center; gap: 5px; }
  .compact-field select { min-height: 34px; border: 0; background: transparent; }
  .selection-bar { justify-content: space-between; margin-top: 10px; padding: 8px 10px; border-radius: 6px; color: var(--text); background: var(--primary-soft); }

  .content-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; margin-top: 8px; }
  .content-grid.with-detail { grid-template-columns: minmax(0, 1fr) 300px; }
  .file-surface { position: relative; min-width: 0; }
  .file-surface > .status { padding-top: 5px; }
  .drop-overlay { position: absolute; z-index: 25; inset: 0; display: none; min-height: 280px; place-items: center; align-content: center; gap: 10px; border: 2px dashed var(--primary); border-radius: 8px; color: var(--primary); background: color-mix(in srgb, var(--primary-soft) 92%, transparent); pointer-events: none; }
  .file-surface.dragging .drop-overlay { display: grid; }

  .file-row { cursor: pointer; }
  .file-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; padding-top: 8px; }
  .file-card { display: grid; min-width: 0; min-height: 142px; gap: 9px; padding: 12px; border: 1px solid var(--line); border-radius: 6px; color: var(--text); background: var(--surface); cursor: pointer; }
  .file-card:hover, .file-card.selected { border-color: var(--line-strong); background: var(--primary-soft); }
  .file-card-head { display: flex; justify-content: space-between; gap: 8px; }
  .file-card-icon { display: inline-flex; width: 42px; height: 42px; align-items: center; justify-content: center; border-radius: 6px; color: var(--muted); background: var(--surface-muted); }
  .file-card-icon.folder { color: var(--primary); background: var(--primary-soft); }
  .file-card-icon .icon, .file-card-icon svg { width: 25px; height: 25px; }
  .file-card-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .file-card-meta { color: var(--muted); font-size: 12px; }

  .detail-panel { align-self: start; overflow: hidden; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); }
  .detail-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 14px; border-bottom: 1px solid var(--line); }
  .detail-head h2 { margin-top: 4px; overflow-wrap: anywhere; }
  .eyebrow { color: var(--muted); font-size: 12px; }
  .detail-preview { display: grid; min-height: 126px; margin: 14px; place-items: center; border-radius: 6px; color: var(--muted); background: var(--surface-muted); }
  .detail-preview .icon, .detail-preview svg { width: 42px; height: 42px; }
  .detail-list { margin: 0; padding: 0 14px; }
  .detail-list div { display: grid; grid-template-columns: 78px minmax(0, 1fr); gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--line); }
  .detail-list dt { color: var(--muted); }
  .detail-list dd { min-width: 0; margin: 0; overflow-wrap: anywhere; }
  .detail-actions { display: grid; gap: 7px; padding: 14px; }

  .activity-bar { position: sticky; z-index: 15; bottom: 12px; justify-content: space-between; margin-top: 14px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface-raised); box-shadow: var(--shadow); }
  .activity-copy { display: grid; flex: 1; gap: 2px; }
  .activity-copy span { color: var(--muted); font-size: 12px; }
  .progress-track { width: min(180px, 30%); height: 5px; overflow: hidden; border-radius: 3px; background: var(--surface-muted); }
  .progress-track span { display: block; width: 0; height: 100%; background: var(--primary); transition: width .2s ease; }

  .data-list { display: grid; border-top: 1px solid var(--line); }
  .data-list.compact { max-height: 260px; overflow: auto; border: 1px solid var(--line); border-radius: 6px; }
  .data-row { display: grid; grid-template-columns: minmax(180px, 1.5fr) minmax(150px, 1fr) 130px 160px auto; align-items: center; gap: 12px; min-width: 0; padding: 12px 8px; border-bottom: 1px solid var(--line); }
  .data-row:last-child { border-bottom: 0; }
  .data-row-main { display: grid; min-width: 0; gap: 3px; }
  .data-row-main strong, .data-row-main span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .data-row-main span, .data-cell-muted { color: var(--muted); font-size: 12px; }
  .data-row-actions { display: flex; justify-content: flex-end; gap: 6px; }
  .status-pill { display: inline-flex; width: max-content; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 999px; color: var(--muted); background: var(--surface-muted); font-size: 12px; }
  .status-pill.success { color: var(--success); background: var(--success-soft); }
  .status-pill.running { color: var(--primary); background: var(--primary-soft); }
  .status-pill.warning { color: var(--warning); background: var(--warning-soft); }
  .status-pill.error { color: var(--danger); background: var(--danger-soft); }
  .status-pill.running .icon { animation: edgedisk-spin 1s linear infinite; }
  .share-data-row { grid-template-columns: minmax(0, 1fr) auto auto; }
  @keyframes edgedisk-spin { to { transform: rotate(360deg); } }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
  }

  @media (max-width: 980px) {
    .topbar { grid-template-columns: 190px minmax(200px, 1fr) auto; }
    .workspace { grid-template-columns: 190px minmax(0, 1fr); }
    .content-grid.with-detail { grid-template-columns: minmax(0, 1fr); }
    .detail-panel { order: -1; }
    .data-row { grid-template-columns: minmax(180px, 1fr) 120px auto; }
    .data-row .hide-tablet { display: none; }
  }

  @media (max-width: 720px) {
    .topbar { position: static; grid-template-columns: 1fr auto; min-height: auto; padding: 10px; }
    .search-field { grid-column: 1 / -1; grid-row: 2; max-width: none; }
    .account-copy { display: none; }
    .workspace { display: block; min-height: 0; }
    .sidebar { position: static; height: auto; flex-direction: row; overflow-x: auto; padding: 8px; border-right: 0; border-bottom: 1px solid var(--line); }
    .sidebar-spacer, .sidebar-note { display: none; }
    .nav-button { width: auto; flex: 0 0 auto; }
    .nav-count { margin-left: 4px; }
    .main-area { padding: 16px 10px; }
    .page-heading { display: grid; }
    .heading-actions { justify-content: flex-start; }
    .heading-actions .btn, .heading-actions .file-picker { flex: 1 1 auto; }
    .selection-bar { align-items: flex-start; }
    .selection-actions { width: 100%; }
    .selection-actions .btn { flex: 1 1 auto; }
    .data-row { grid-template-columns: minmax(0, 1fr) auto; }
    .data-row .hide-mobile { display: none; }
    .progress-track { order: 3; width: 100%; }
  }

  @media (max-width: 520px) {
    .size-cell { display: none; }
    .file-toolbar { align-items: flex-start; }
    .file-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
`
