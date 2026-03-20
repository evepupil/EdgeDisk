import { createRoute } from 'honox/factory'
import { DashboardPage } from '../../components/dashboard-page'
import dashboardScript from '../../client/dashboard.ts?raw'
import type { Env } from '../../../src/server/types'

export default createRoute(async (c) => {
  const env = c.env as Env
  const appName = env.APP_NAME || 'EdgeDisk'
  return c.render(
    <>
      <DashboardPage appName={appName} />
      <script type="module" dangerouslySetInnerHTML={{ __html: dashboardScript }} />
    </>
  )
})