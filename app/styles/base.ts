export const baseStyles = `
  :root {
    color-scheme: light dark;
    --background: light-dark(rgb(255 255 255), rgb(24 24 24));
    --foreground: light-dark(rgb(26 28 31), rgb(255 255 255));
    --card: color-mix(in oklab, var(--foreground) 5%, transparent);
    --card-foreground: var(--foreground);
    --popover: light-dark(rgb(255 255 255), rgb(45 45 45));
    --popover-foreground: var(--foreground);
    --primary: light-dark(rgb(51 156 255), rgb(131 195 255));
    --primary-foreground: light-dark(rgb(255 255 255), rgb(13 13 13));
    --secondary: light-dark(rgb(255 255 255 / 96%), rgb(54 54 54 / 96%));
    --secondary-foreground: var(--foreground);
    --muted: color-mix(in srgb, var(--foreground) 10%, transparent);
    --muted-foreground: light-dark(rgb(26 28 31 / 49.4%), rgb(255 255 255 / 49.8%));
    --accent: light-dark(rgb(229 242 255), rgb(13 39 63));
    --accent-foreground: var(--primary);
    --destructive: light-dark(rgb(226 85 7), rgb(255 133 73));
    --border: light-dark(rgb(26 28 31 / 8%), rgb(255 255 255 / 8.2%));
    --input: light-dark(rgb(26 28 31 / 11.8%), color-mix(in oklab, rgb(0 0 0) 10%, transparent));
    --ring: light-dark(rgb(51 156 255), rgb(131 195 255 / 76%));
    --series-1: var(--primary);
    --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
    --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    --radius: 12.5px;
    --radius-sm: 7.5px;
    --radius-lg: 12.5px;
    --radius-xl: 20px;
    --shadow-sm: 0 1px 2px -1px rgb(0 0 0 / 8%);
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 430;
    line-height: 1.5;
  }

  :root[data-theme="light"] { color-scheme: light; }
  :root[data-theme="dark"] { color-scheme: dark; }

  * { box-sizing: border-box; }
  html, body { min-height: 100%; }
  body { margin: 0; color: var(--foreground); background: var(--background); }
  body, button, input, select { letter-spacing: 0; }
  button, input, select { font: inherit; }
  button, a, label { -webkit-tap-highlight-color: transparent; }
  a { color: inherit; text-decoration: none; }
  h1, h2, p { margin: 0; }
  h1 { font-size: 24px; font-weight: 500; line-height: 1.25; }
  h2 { font-size: 20px; font-weight: 500; line-height: 1.25; }
  strong, th { font-weight: 500; }
  small { color: var(--muted-foreground); font-size: 12px; line-height: 16px; }
  .hidden { display: none !important; }
  .muted { color: var(--muted-foreground); }
  .mono { font-family: var(--font-mono); }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

  .icon { display: inline-flex; width: 16px; height: 16px; flex: 0 0 16px; align-items: center; justify-content: center; }
  .icon svg { display: block; width: 16px; height: 16px; stroke-width: 1.6; }

  .brand { display: inline-flex; min-width: 0; align-items: center; gap: 10px; color: var(--foreground); }
  .brand:hover { text-decoration: none; }
  .brand-mark { display: inline-flex; width: 32px; height: 32px; flex: 0 0 32px; align-items: center; justify-content: center; border-radius: 6px; color: var(--primary-foreground); background: var(--primary); }

  .btn, .icon-btn, .nav-button {
    display: inline-flex;
    width: fit-content;
    max-width: 100%;
    min-height: 28px;
    align-items: center;
    justify-content: center;
    gap: 4px;
    margin: 0;
    padding: 0 8px;
    border: 1px solid var(--input);
    border-radius: var(--radius-lg);
    color: var(--secondary-foreground);
    background: var(--secondary);
    cursor: pointer;
    text-align: center;
    white-space: nowrap;
  }
  .btn:hover, .icon-btn:hover, .nav-button:hover { background: color-mix(in srgb, var(--foreground) 6%, var(--secondary)); }
  .btn.primary, .nav-button.active { border-color: transparent; color: var(--primary-foreground); background: var(--foreground); }
  .btn.primary:hover, .nav-button.active:hover { background: color-mix(in srgb, var(--foreground) 80%, transparent); }
  .btn.ghost, .btn.quiet, .icon-btn { border-color: transparent; color: var(--muted-foreground); background: transparent; }
  .btn.ghost:hover, .btn.quiet:hover, .icon-btn:hover { color: var(--foreground); background: color-mix(in srgb, var(--foreground) 6%, var(--secondary)); }
  .btn.danger { border-color: color-mix(in srgb, var(--destructive) 45%, transparent); color: var(--destructive); background: transparent; }
  .btn:disabled, .icon-btn:disabled { cursor: not-allowed; opacity: .4; }
  .btn:focus-visible, .icon-btn:focus-visible, .nav-button:focus-visible, input:focus-visible, select:focus-visible, summary:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
  .icon-btn, .btn.icon-only { width: 28px; height: 28px; min-height: 28px; padding: 0; }
  .icon-btn.active { border-color: var(--primary); color: var(--primary-foreground); background: var(--primary); }

  [data-tooltip] { position: relative; }
  [data-tooltip]::after { position: absolute; z-index: 50; right: 0; top: calc(100% + 6px); width: max-content; max-width: 180px; padding: 4px 8px; border: 1px solid var(--border); border-radius: var(--radius-lg); color: var(--popover-foreground); background: var(--popover); content: attr(data-tooltip); font-size: 12px; opacity: 0; pointer-events: none; transform: translateY(-2px); transition: opacity .12s ease, transform .12s ease; }
  [data-tooltip]:hover::after, [data-tooltip]:focus-visible::after { opacity: 1; transform: translateY(0); }

  input, select {
    min-height: 28px;
    margin: 0;
    outline: none;
    border: 1px solid var(--input);
    border-radius: var(--radius-lg);
    color: var(--foreground);
    background: var(--secondary);
  }
  input { padding: 0 8px; }
  select { padding: 0 28px 0 8px; }
  input::placeholder { color: var(--muted-foreground); }
  input:focus-visible, select:focus-visible { border-color: var(--ring); box-shadow: inset 0 0 0 1px var(--ring); }
  input[type="checkbox"] { appearance: none; width: 14px; height: 14px; min-height: 0; padding: 0; border-radius: var(--radius-sm); background: var(--secondary); box-shadow: var(--shadow-sm); cursor: pointer; }
  input[type="checkbox"]:checked { border-color: var(--primary); background: var(--primary); }
  input[type="checkbox"]:checked::before { display: block; width: 100%; height: 100%; background: var(--primary-foreground); content: ""; clip-path: polygon(20% 52%, 40% 72%, 80% 27%, 88% 36%, 40% 87%, 12% 60%); }
  label { color: var(--foreground); }

  .status { min-height: 0; color: var(--muted-foreground); }
  .status:not(:empty) { padding: 7px 0; }
  .status.success { color: var(--muted-foreground); }
  .status.error, .status.warning, .danger-text { color: var(--destructive); }

  .crumbs { display: flex; min-width: 0; flex-wrap: wrap; align-items: center; gap: 4px; margin-top: 4px; color: var(--muted-foreground); }
  .crumbs button { display: inline-flex; min-width: 0; align-items: center; gap: 4px; padding: 2px 3px; overflow: hidden; border: 0; color: inherit; background: transparent; text-overflow: ellipsis; cursor: pointer; }
  .crumbs button:hover { color: var(--foreground); }
  .toolbar-group { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
  .segmented { display: inline-flex; gap: 2px; padding: 2px; border-radius: 6px; background: var(--muted); }
  .segmented .icon-btn { border-color: transparent; }
  .segmented .icon-btn.active { color: var(--primary-foreground); background: var(--primary); }

  .table-wrap { width: 100%; overflow-x: auto; scrollbar-width: thin; }
  .file-table { width: 100%; border-collapse: collapse; color: var(--foreground); table-layout: fixed; text-align: left; }
  .file-table th, .file-table td { padding: 10px 24px 10px 0; overflow-wrap: anywhere; border-bottom: 1px solid var(--border); text-align: left; vertical-align: top; }
  .compact-table th, .compact-table td { padding-top: 6px; padding-bottom: 6px; }
  .file-table th:not(:last-child), .file-table td:not(:last-child) { padding-right: 16px; }
  .file-table th:last-child, .file-table td:last-child { padding-right: 0; }
  .file-table thead th { padding-top: 8px; padding-bottom: 8px; border-bottom-color: color-mix(in srgb, var(--foreground) 16%, transparent); font-weight: 600; }
  .file-table tbody tr { transition: background .12s ease; }
  .file-table tbody tr:hover, .file-table tbody tr.selected { background: var(--accent); }
  .check-cell { width: 42px; }
  .size-cell { width: 110px; }
  .time-cell { width: 170px; }
  .menu-cell { width: 48px; text-align: right !important; }
  .item-name { display: flex; min-width: 0; align-items: center; gap: 10px; }
  .item-icon { display: inline-flex; width: 28px; height: 28px; flex: 0 0 28px; align-items: center; justify-content: center; color: var(--muted-foreground); }
  .item-icon.folder { color: var(--series-1); }
  .name-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .file-table .secondary { color: var(--muted-foreground); }

  .row-menu { position: relative; display: inline-block; }
  .row-menu summary { display: inline-flex; width: 28px; height: 28px; align-items: center; justify-content: center; border-radius: var(--radius-lg); color: var(--muted-foreground); cursor: pointer; list-style: none; }
  .row-menu summary::-webkit-details-marker { display: none; }
  .row-menu summary:hover { color: var(--foreground); background: var(--muted); }
  .row-menu[open] .menu-popover { display: grid; }
  .menu-popover { position: absolute; z-index: 20; right: 0; top: 32px; display: none; width: 180px; padding: 5px; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--popover); }
  .menu-popover button { display: flex; width: 100%; min-height: 32px; align-items: center; gap: 6px; padding: 0 8px; border: 0; border-radius: var(--radius-sm); color: var(--foreground); background: transparent; cursor: pointer; }
  .menu-popover button:hover { background: var(--muted); }
  .menu-popover button.danger-text { color: var(--destructive); }

  dialog { width: min(520px, calc(100vw - 24px)); max-height: calc(100vh - 32px); padding: 0; overflow: auto; border: 0; border-radius: var(--radius-xl); color: var(--card-foreground); background: color-mix(in oklab, var(--background) 96%, var(--foreground) 4%); }
  dialog::backdrop { background: color-mix(in srgb, var(--foreground) 28%, transparent); }
  .dialog-form { display: grid; gap: 12px; padding: 18px; }
  .dialog-head, .dialog-actions, .dialog-subhead { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .dialog-actions { padding-top: 4px; justify-content: flex-end; }
  .dialog-form label { display: grid; gap: 6px; }
  .dialog-form input:not([type="checkbox"]), .dialog-form select { width: 100%; }
  .check-label { display: flex !important; align-items: center; gap: 6px !important; }
  .form-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; }
  .align-end { align-self: end; }
  .copy-field { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 7px; }
  .target-line { padding: 10px; overflow-wrap: anywhere; border-radius: var(--radius-lg); color: var(--muted-foreground); background: var(--card); }
  .player-container video { display: block; width: 100%; max-height: 68vh; border-radius: 6px; background: #000; }
  .audio-player { display: grid; gap: 14px; place-items: center; padding: 28px 0; }
  .audio-player audio { width: 100%; }
  .empty-state { display: grid; min-height: 280px; place-items: center; align-content: center; gap: 8px; color: var(--muted-foreground); text-align: center; }

  @media (max-width: 680px) {
    h1 { font-size: 22px; }
    .form-row { grid-template-columns: 1fr; }
    .align-end { width: 100%; }
  }
`
