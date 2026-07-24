import { createRoute } from 'honox/factory'
import { DashboardPage } from '../../components/dashboard-page'
import type { Env } from '../../../src/server/types'

export default createRoute(async (c) => {
  const env = c.env as Env
  const appName = env.APP_NAME || 'EdgeDisk'
  return c.render(
    <>
      <DashboardPage appName={appName} />
      {import.meta.env.PROD
        ? <script type="module" src="/dashboard.js" />
        : <script type="module" src="/app/client/dashboard.ts" />}
    </>
  )
})
