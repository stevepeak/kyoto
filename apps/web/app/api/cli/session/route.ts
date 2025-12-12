import { type NextRequest, NextResponse } from 'next/server'

import { cliAuthStore } from '@/lib/cli-auth-store'

/**
 * API route for CLI to poll for session token
 * GET /api/cli/session?state=xxx
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const state = searchParams.get('state')

  if (!state) {
    return NextResponse.json(
      { error: 'Missing state parameter' },
      { status: 400 },
    )
  }

  const session = cliAuthStore.getSession(state)

  if (!session) {
    return NextResponse.json(
      { error: 'Session not found or expired' },
      { status: 404 },
    )
  }

  if (session.status === 'pending') {
    // Still waiting for OAuth completion
    return NextResponse.json({ status: 'pending' }, { status: 404 })
  }

  if (session.status === 'completed' && session.sessionToken && session.user) {
    // Authentication successful, return the session token
    // Delete the session after returning it (one-time use)
    cliAuthStore.deleteSession(state)

    return NextResponse.json({
      sessionToken: session.sessionToken,
      user: session.user,
    })
  }

  return NextResponse.json(
    { error: 'Session in invalid state' },
    { status: 500 },
  )
}
