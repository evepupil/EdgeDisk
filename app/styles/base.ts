export const baseStyles = `
  :root {
    color-scheme: dark;
    --bg: #141619;
    --surface: #1b1e22;
    --surface-raised: #22262b;
    --surface-muted: #272b31;
    --text: #f1f3f5;
    --muted: #a7adb5;
    --line: #343941;
    --line-strong: #4a515c;
    --primary: #4f8cff;
    --primary-hover: #6a9dff;
    --primary-soft: #253451;
    --success: #39a879;
    --success-soft: #1f3d32;
    --warning: #d9a441;
    --warning-soft: #46391f;
    --danger: #e2636f;
    --danger-soft: #48272c;
    --shadow: 0 16px 42px rgba(0, 0, 0, .28);
    font-family: Inter, "Segoe UI", "Microsoft YaHei", system-ui, sans-serif;
    font-size: 14px;
  }

  :root[data-theme="light"] {
    color-scheme: light;
    --bg: #f5f6f8;
    --surface: #ffffff;
    --surface-raised: #ffffff;
    --surface-muted: #eef0f3;
    --text: #20242a;
    --muted: #68707c;
    --line: #dfe3e8;
    --line-strong: #c6ccd4;
    --primary: #2468d8;
    --primary-hover: #1858bd;
    --primary-soft: #e7effd;
    --success: #187a54;
    --success-soft: #e3f3ec;
    --warning: #9a6813;
    --warning-soft: #f8efd9;
    --danger: #c43e4b;
    --danger-soft: #f9e7e9;
    --shadow: 0 16px 42px rgba(31, 35, 40, .14);
  }

  * { box-sizing: border-box; }
  html, body { min-height: 100%; }
  body { margin: 0; background: var(--bg); color: var(--text); }
  body, button, input, select { letter-spacing: 0; }
  button, input, select { font: inherit; }
  button, a, label { -webkit-tap-highlight-color: transparent; }
  a { color: inherit; text-decoration: none; }
  h1, h2, p { margin-top: 0; }
  h1 { margin-bottom: 5px; font-size: 24px; line-height: 1.25; font-weight: 650; }
  h2 { margin-bottom: 0; font-size: 18px; line-height: 1.35; font-weight: 650; }
  p { margin-bottom: 0; color: var(--muted); }
  strong { font-weight: 650; }
  .hidden { display: none !important; }
  .muted { color: var(--muted); }
  .mono { font-family: Consolas, "SFMono-Regular", monospace; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

  .icon { display: inline-flex; width: 18px; height: 18px; flex: 0 0 18px; align-items: center; justify-content: center; }
  .icon svg { width: 18px; height: 18px; stroke-width: 1.8; }

  .brand { display: inline-flex; align-items: center; gap: 10px; min-width: 0; font-size: 16px; }
  .brand-mark { display: inline-flex; width: 32px; height: 32px; flex: 0 0 32px; align-items: center; justify-content: center; border-radius: 6px; color: #fff; background: var(--primary); }

  .btn, .icon-btn, .nav-button {
    border: 1px solid var(--line);
    color: var(--text);
    background: var(--surface);
    cursor: pointer;
    transition: background .15s ease, border-color .15s ease, color .15s ease;
  }
  .btn { display: inline-flex; min-height: 36px; align-items: center; justify-content: center; gap: 8px; padding: 0 12px; border-radius: 6px; white-space: nowrap; }
  .icon-btn { position: relative; display: inline-flex; width: 36px; height: 36px; align-items: center; justify-content: center; padding: 0; border-radius: 6px; }
  .btn:hover, .icon-btn:hover, .nav-button:hover { border-color: var(--line-strong); background: var(--surface-muted); }
  .btn:focus-visible, .icon-btn:focus-visible, .nav-button:focus-visible, input:focus-visible, select:focus-visible, summary:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
  .btn.primary { border-color: var(--primary); color: #fff; background: var(--primary); }
  .btn.primary:hover { border-color: var(--primary-hover); background: var(--primary-hover); }
  .btn.quiet { border-color: transparent; background: transparent; }
  .btn.danger { border-color: color-mix(in srgb, var(--danger) 55%, var(--line)); color: var(--danger); background: var(--danger-soft); }
  .btn:disabled, .icon-btn:disabled { cursor: not-allowed; opacity: .5; }
  .icon-btn.active { border-color: var(--primary); color: var(--primary); background: var(--primary-soft); }

  [data-tooltip]::after { position: absolute; z-index: 30; right: 0; top: calc(100% + 6px); width: max-content; max-width: 180px; padding: 5px 8px; border-radius: 4px; color: var(--surface); background: var(--text); content: attr(data-tooltip); font-size: 12px; opacity: 0; pointer-events: none; transform: translateY(-2px); transition: opacity .12s ease, transform .12s ease; }
  [data-tooltip]:hover::after, [data-tooltip]:focus-visible::after { opacity: 1; transform: translateY(0); }

  input, select {
    min-height: 38px;
    border: 1px solid var(--line);
    border-radius: 6px;
    color: var(--text);
    background: var(--surface);
  }
  input { padding: 0 11px; }
  select { padding: 0 30px 0 10px; }
  input::placeholder { color: var(--muted); }
  input[type="checkbox"] { width: 16px; height: 16px; min-height: 0; accent-color: var(--primary); }
  label { display: grid; gap: 7px; color: var(--muted); }

  .status { min-height: 22px; color: var(--muted); }
  .status.success { color: var(--success); }
  .status.error, .danger-text { color: var(--danger); }

  .crumbs { display: flex; min-width: 0; flex-wrap: wrap; align-items: center; gap: 5px; color: var(--muted); }
  .crumbs button { min-width: 0; padding: 2px 3px; overflow: hidden; border: 0; color: inherit; background: transparent; text-overflow: ellipsis; cursor: pointer; }
  .crumbs button:hover { color: var(--text); }

  .toolbar-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .segmented { display: inline-flex; gap: 2px; padding: 2px; border-radius: 7px; background: var(--surface-muted); }
  .segmented .icon-btn { width: 32px; height: 32px; border-color: transparent; background: transparent; }
  .segmented .icon-btn.active { color: var(--text); background: var(--surface); }

  .table-wrap { width: 100%; overflow: visible; }
  .file-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .file-table th, .file-table td { height: 48px; padding: 0 12px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: middle; }
  .file-table th { color: var(--muted); font-size: 12px; font-weight: 600; }
  .file-table tbody tr { transition: background .12s ease; }
  .file-table tbody tr:hover, .file-table tbody tr.selected { background: var(--primary-soft); }
  .check-cell { width: 44px; text-align: center !important; }
  .size-cell { width: 110px; }
  .time-cell { width: 170px; }
  .menu-cell { width: 52px; text-align: right !important; }
  .item-name { display: flex; min-width: 0; align-items: center; gap: 10px; }
  .item-icon { display: inline-flex; width: 30px; height: 30px; flex: 0 0 30px; align-items: center; justify-content: center; border-radius: 5px; color: var(--muted); background: var(--surface-muted); }
  .item-icon.folder { color: var(--primary); background: var(--primary-soft); }
  .name-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .file-table .secondary { color: var(--muted); }

  .row-menu { position: relative; display: inline-block; }
  .row-menu summary { display: inline-flex; width: 32px; height: 32px; align-items: center; justify-content: center; border-radius: 5px; cursor: pointer; list-style: none; }
  .row-menu summary::-webkit-details-marker { display: none; }
  .row-menu summary:hover { background: var(--surface-muted); }
  .row-menu[open] .menu-popover { display: grid; }
  .menu-popover { position: absolute; z-index: 20; right: 0; top: 36px; display: none; width: 180px; padding: 5px; border: 1px solid var(--line); border-radius: 7px; background: var(--surface-raised); box-shadow: var(--shadow); }
  .menu-popover button { display: flex; width: 100%; min-height: 34px; align-items: center; gap: 8px; padding: 0 9px; border: 0; border-radius: 4px; color: var(--text); background: transparent; cursor: pointer; }
  .menu-popover button:hover { background: var(--surface-muted); }
  .menu-popover button.danger-text { color: var(--danger); }

  dialog { width: min(560px, calc(100vw - 24px)); max-height: calc(100vh - 32px); padding: 0; overflow: auto; border: 1px solid var(--line); border-radius: 8px; color: var(--text); background: var(--surface-raised); box-shadow: var(--shadow); }
  dialog::backdrop { background: rgba(0, 0, 0, .55); }
  .dialog-form { display: grid; gap: 15px; padding: 18px; }
  .dialog-head, .dialog-actions, .dialog-subhead { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .dialog-actions { padding-top: 5px; justify-content: flex-end; }
  .dialog-form input:not([type="checkbox"]), .dialog-form select { width: 100%; }
  .check-label { display: flex; align-items: center; gap: 9px; color: var(--text); }
  .form-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; }
  .align-end { align-self: end; }
  .copy-field { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 7px; }
  .target-line { padding: 10px; overflow-wrap: anywhere; border: 1px solid var(--line); border-radius: 6px; color: var(--muted); background: var(--surface); }
  .player-container video { display: block; width: 100%; max-height: 68vh; border-radius: 6px; background: #000; }
  .audio-player { display: grid; gap: 14px; place-items: center; padding: 28px 0; }
  .audio-player audio { width: 100%; }

  .empty-state { display: grid; min-height: 220px; place-items: center; align-content: center; gap: 10px; color: var(--muted); text-align: center; }
  .empty-state .icon { width: 30px; height: 30px; }

  @media (max-width: 680px) {
    h1 { font-size: 21px; }
    .time-cell { display: none; }
    .size-cell { width: 82px; }
    .form-row { grid-template-columns: 1fr; }
    .align-end { width: 100%; }
  }
`
