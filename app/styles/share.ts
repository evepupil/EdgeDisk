export const shareStyles = `
  .share-page { min-height: 100vh; padding: 18px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); background: var(--background); }
  .share-header { display: flex; min-width: 0; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
  .share-main { padding-top: 26px; }
  .share-heading { display: flex; min-width: 0; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
  .share-meta { display: flex; flex-wrap: wrap; gap: 8px 18px; color: var(--muted-foreground); }
  .share-toolbar { display: flex; min-width: 0; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin: 16px 0 8px; padding: 10px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
  .share-table tbody tr[data-folder] { cursor: pointer; }
  .share-action-cell { width: 88px; text-align: right !important; }
  .share-row-actions { display: flex; justify-content: flex-end; gap: 4px; }

  @media (max-width: 620px) {
    .share-page { padding: 14px 10px; }
    .share-toolbar { align-items: stretch; }
    .share-toolbar > .muted { width: 100%; }
    .share-toolbar .toolbar-group { width: 100%; }
    .share-toolbar .btn { flex: 1; }
    .share-action-cell { width: 64px; }
  }
`
