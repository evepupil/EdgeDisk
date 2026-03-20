import api from '../../src/server/api'
import { Hono } from 'hono'
import { routeRequest } from '../../src/server/routes'
import type { Env } from '../../src/server/types'

const app = new Hono<{ Bindings: Env }>()

app.all('*', async (c) => {
  const pathname = new URL(c.req.url).pathname
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    return await api.fetch(c.req.raw, c.env)
  }
  return await routeRequest(c.req.raw, c.env)
})

export default app
