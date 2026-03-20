import { HttpError } from './errors.ts'
import { json } from './http.ts'
import { normalizeOptionalRelativePath } from './path.ts'
import { getShareView, streamSharedObject } from './shares.ts'
import type { Env } from './types.ts'

export async function routeRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname

  if (path === '/') return Response.redirect('/app', 302)

  if (path.startsWith('/share-api/')) {
    const shareCode = path.slice('/share-api/'.length)
    if (!shareCode) throw new HttpError(404, '分享不存在')
    return json(await getShareView(env, shareCode, normalizeOptionalRelativePath(url.searchParams.get('sub') || ''), url.origin))
  }

  if (path.startsWith('/s/')) {
    const parts = path.slice(3).split('/')
    const shareCode = parts[0]
    const action = parts[1] || ''
    if (!shareCode || action !== 'file') throw new HttpError(404, '路由不存在')
    return streamSharedObject(env, shareCode, url.searchParams.get('path'), url.searchParams.get('download') === '1')
  }

  throw new HttpError(404, '路由不存在')
}
