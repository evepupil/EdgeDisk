import { createRoute } from 'honox/factory'
import { respondError } from '../../../../src/server/errors'
import { streamSharedObject } from '../../../../src/server/shares'
import type { Env } from '../../../../src/server/types'

export default createRoute(async (c) => {
  try {
    const env = c.env as Env
    const shareCode = c.req.param('code') || ''
    return await streamSharedObject(env, shareCode, c.req.query('path') ?? null, c.req.query('download') === '1')
  } catch (error) {
    return respondError(error)
  }
})