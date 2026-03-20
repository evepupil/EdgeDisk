import { Script } from 'honox/server/components'
import { createRoute } from 'honox/factory'
import { DashboardPage } from '../../components/dashboard-page'
import { requireAdmin } from '../../../src/server/auth'
import type { Env } from '../../../src/server/types'

export default createRoute(async (c) => {
  const env = c.env as Env
  await requireAdmin(c.req.raw, env)
  const appName = env.APP_NAME || 'EdgeDisk'
  return c.render(
    <>
      <DashboardPage appName={appName} />
      <Script src="/app/client/dashboard.ts" />
    </>
  )
})
