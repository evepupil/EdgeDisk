export const shareStyles = `
  .share-page { min-height: 100vh; background: var(--bg); }
  .share-header { display: flex; min-height: 62px; align-items: center; justify-content: space-between; gap: 16px; padding: 10px max(18px, calc((100% - 1180px) / 2)); border-bottom: 1px solid var(--line); background: var(--surface); }
  .share-header-actions, .share-meta, .share-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .share-badge { display: inline-flex; min-height: 30px; align-items: center; gap: 6px; padding: 0 9px; border-radius: 999px; color: var(--success); background: var(--success-soft); font-size: 12px; }
  .share-main { width: min(1180px, calc(100% - 28px)); margin: 0 auto; padding: 32px 0 48px; }
  .share-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
  .share-meta { margin-top: 7px; color: var(--muted); }
  .share-meta span:not(:empty) + span:not(:empty)::before { margin-right: 10px; content: "·"; }
  .share-toolbar { justify-content: space-between; min-height: 54px; margin-top: 16px; padding: 8px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  .share-table tbody tr[data-folder] { cursor: pointer; }
  .share-table tbody tr[data-folder]:hover { background: var(--primary-soft); }
  .share-action-cell { width: 150px; text-align: right !important; }
  .share-row-actions { display: flex; justify-content: flex-end; gap: 6px; }

  @media (max-width: 680px) {
    .share-header { padding: 10px; }
    .share-main { width: calc(100% - 20px); padding-top: 22px; }
    .share-badge { display: none; }
    .share-toolbar { align-items: stretch; }
    .share-toolbar > .muted { width: 100%; }
    .share-toolbar .toolbar-group { width: 100%; }
    .share-toolbar .btn { flex: 1; }
    .share-action-cell { width: 52px; }
    .share-row-actions .btn span:not(.icon) { display: none; }
  }
`
