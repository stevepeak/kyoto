import { z } from 'zod'

import { consumeCliLogin } from '@/lib/cli-login-store'

export const runtime = 'nodejs'

const querySchema = z.object({
  loginId: z.string().min(1),
})

function getBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null
  const match = /^Bearer\s+(.+)$/.exec(authHeader)
  return match?.[1] ?? null
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const parsedQuery = querySchema.safeParse({
    loginId: url.searchParams.get('loginId'),
  })
  if (!parsedQuery.success) {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }

  const pollToken = getBearerToken(request.headers.get('authorization'))
  if (!pollToken) {
    return Response.json({ error: 'missing_poll_token' }, { status: 401 })
  }

  const status = consumeCliLogin({
    loginId: parsedQuery.data.loginId,
    pollToken,
  })

  return Response.json(status, {
    headers: {
      'cache-control': 'no-store',
    },
  })
}

