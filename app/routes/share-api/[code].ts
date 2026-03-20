import { createRoute } from 'honox/factory'
import { respondError } from '../../../src/server/errors'
import { json } from '../../../src/server/http'
import { normalizeOptionalRelativePath } from '../../../src/server/path'
import { getShareView } from '../../../src/server/shares'
import type { Env } from '../../../src/server/types'

export default createRoute(async (c) => {
  try {
    const env = c.env as Env
    const shareCode = c.req.param('code') || ''
    const requestUrl = new URL(c.req.url)
    return json(await getShareView(env, shareCode, normalizeOptionalRelativePath(c.req.query('sub') || ''), requestUrl.origin))
  } catch (error) {
    return respondError(error)
  }
})