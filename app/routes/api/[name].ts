import { Hono } from 'hono'
import api from '../../../src/server/api'
import type { Env } from '../../../src/server/types'

const app = new Hono<{ Bindings: Env }>()

app.all('*', async (c) => {
  const url = new URL(c.req.url)
  url.pathname = url.pathname.replace(/^\/api/, '') || '/'
  return await api.fetch(new Request(url.toString(), c.req.raw), c.env)
})

export default app