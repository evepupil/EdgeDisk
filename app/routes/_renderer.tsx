import { jsxRenderer } from 'hono/jsx-renderer'

export default jsxRenderer(({ children }) => {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>EdgeDisk</title>
      </head>
      <body>{children}</body>
    </html>
  )
})
