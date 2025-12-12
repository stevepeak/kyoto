import { NextRequest, NextResponse } from 'next/server'

import { getCliSession } from '@/lib/auth-cli-store'

/**
 * CLI status endpoint for polling login completion.
 * Returns the session token if login is complete, otherwise returns pending.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const state = searchParams.get('state')

  if (!state) {
    return NextResponse.json({ error: 'Missing state parameter' }, { status: 400 })
  }

  const sessionToken = getCliSession(state)

  if (!sessionToken) {
    return NextResponse.json({ status: 'pending' })
  }

  return NextResponse.json({ status: 'complete', sessionToken })
}
