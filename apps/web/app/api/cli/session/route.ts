import { NextResponse } from 'next/server'

import { getCliSession } from '@/lib/cli-auth'

function getBearerToken(req: Request): string | null {
  const header = req.headers.get('authorization')
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? null
}

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const token = getBearerToken(req)
  if (!token) {
    return NextResponse.json(
      { error: 'Missing Authorization: Bearer <token>' },
      { status: 401 },
    )
  }

  const session = getCliSession({ token })
  if (!session) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  return NextResponse.json({
    token: session.token,
    userId: session.userId,
    login: session.login,
    createdAtMs: session.createdAtMs,
  })
}
