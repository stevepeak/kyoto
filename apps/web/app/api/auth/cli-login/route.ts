import { NextRequest, NextResponse } from 'next/server'

import { getConfig } from '@app/config'

const config = getConfig()

/**
 * CLI login initiation endpoint.
 * Redirects to GitHub OAuth with state preserved in callback URL.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const state = searchParams.get('state')

  if (!state) {
    return NextResponse.json({ error: 'Missing state parameter' }, { status: 400 })
  }

  // Build callback URL that includes the state
  const baseUrl = config.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'
  const callbackUrl = `${baseUrl}/api/auth/cli-callback?state=${encodeURIComponent(state)}`

  // Redirect to Better Auth GitHub OAuth with callback URL
  const authUrl = `${baseUrl}/api/auth/signin/github?callbackURL=${encodeURIComponent(callbackUrl)}`

  return NextResponse.redirect(authUrl)
}
