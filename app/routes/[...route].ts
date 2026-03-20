import { Hono } from 'hono'
import { routeRequest } from '../../src/server/routes'
import type { Env } from '../../src/server/types'

const app = new Hono<{ Bindings: Env }>()

app.all('*', async (c) => {
  return await routeRequest(c.req.raw, c.env)
})

export default app
