import { Script } from 'honox/server/components'
import { createRoute } from 'honox/factory'
import { SharePage } from '../../components/share-page'
import { getShareRecord } from '../../../src/server/shares'
import type { Env } from '../../../src/server/types'

export default createRoute(async (c) => {
  const env = c.env as Env
  const shareCode = c.req.param('code') || ''
  await getShareRecord(env, shareCode)
  const appName = env.APP_NAME || 'EdgeDisk'
  return c.render(
    <>
      <SharePage appName={appName} shareCode={shareCode} />
      <Script src="/app/client/share.ts" />
    </>
  )
})
