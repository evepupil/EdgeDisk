import { jsxRenderer } from 'hono/jsx-renderer'
import { styles } from '../styles/theme'

export default jsxRenderer(({ children, title }: any) => {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title || 'EdgeDisk'}</title>
        <style>{styles}</style>
      </head>
      <body>{children}</body>
    </html>
  )
})

