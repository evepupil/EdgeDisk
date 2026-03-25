import { jsxRenderer } from 'hono/jsx-renderer'
import { styles } from '../styles/theme'

const themeBootstrap = `(() => {
  try {
    const key = 'edgedisk:theme'
    const saved = localStorage.getItem(key)
    const preferred = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    const theme = saved === 'light' || saved === 'dark' ? saved : preferred
    document.documentElement.setAttribute('data-theme', theme)
  } catch (_) {
    document.documentElement.setAttribute('data-theme', 'dark')
  }
})();`

export default jsxRenderer(({ children, title }: any) => {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title || 'EdgeDisk'}</title>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <style>{styles}</style>
      </head>
      <body>{children}</body>
    </html>
  )
})
