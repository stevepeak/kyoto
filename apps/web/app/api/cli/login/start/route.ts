import { z } from 'zod'

import { createCliLogin } from '@/lib/cli-login-store'

export const runtime = 'nodejs'

const requestSchema = z
  .object({
    // Optional override for tests
    ttlMs: z.number().int().positive().max(60 * 60 * 1000).optional(),
  })
  .optional()

export async function POST(request: Request) {
  let body: unknown = undefined
  try {
    body = await request.json()
  } catch {
    body = undefined
  }

  const parsed = requestSchema?.parse(body)
  const { loginId, browserToken, pollToken, expiresAtMs } = createCliLogin({
    ttlMs: parsed?.ttlMs,
  })

  const url = new URL(request.url)
  const loginUrl = new URL('/cli/login', url.origin)
  loginUrl.searchParams.set('loginId', loginId)
  loginUrl.searchParams.set('browserToken', browserToken)

  return Response.json({
    loginId,
    pollToken,
    expiresAtMs,
    loginUrl: loginUrl.toString(),
  })
}

