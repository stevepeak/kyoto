import { z } from 'zod'

import { auth } from '@/lib/auth'
import { completeCliLogin } from '@/lib/cli-login-store'

export const runtime = 'nodejs'

const bodySchema = z.object({
  loginId: z.string().min(1),
  browserToken: z.string().min(1),
})

export async function POST(request: Request) {
  const body = bodySchema.safeParse(await request.json().catch(() => null))
  if (!body.success) {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }

  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session?.user) {
    return Response.json({ error: 'not_authenticated' }, { status: 401 })
  }

  const result = completeCliLogin({
    loginId: body.data.loginId,
    browserToken: body.data.browserToken,
    user: {
      id: session.user.id,
      login:
        // `login` is an additionalField in this app's auth config.
        // Fallback to email local-part for safety.
        (session.user as unknown as { login?: string }).login ??
        (session.user.email?.split('@')[0] ?? 'user'),
      name: session.user.name ?? null,
      email: session.user.email ?? null,
      image: session.user.image ?? null,
    },
  })

  if ('status' in result && result.status === 'expired') {
    return Response.json({ error: 'expired' }, { status: 410 })
  }

  return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } })
}

