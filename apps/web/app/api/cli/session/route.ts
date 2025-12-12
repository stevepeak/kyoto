import { NextRequest, NextResponse } from 'next/server'
import { headers as getHeaders } from 'next/headers'

import { auth } from '@/lib/auth'

/**
 * API endpoint for CLI to get the session token after OAuth
 * This endpoint returns the session token from the current authenticated session
 */
export async function GET(request: NextRequest) {
  try {
    // Get session from better-auth
    const headersList = await getHeaders()
    const headersForAuth = new Headers()
    for (const [key, value] of headersList.entries()) {
      headersForAuth.set(key, value)
    }

    const session = await auth.api.getSession({
      headers: headersForAuth,
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 },
      )
    }

    // Extract the session token from the cookie
    // better-auth stores it in a cookie named 'better-auth.session_token'
    const cookieHeader = request.headers.get('cookie') || ''
    const cookies = cookieHeader
      .split(';')
      .map((c) => c.trim())
      .reduce(
        (acc, cookie) => {
          const [key, value] = cookie.split('=')
          if (key && value) {
            acc[key] = decodeURIComponent(value)
          }
          return acc
        },
        {} as Record<string, string>,
      )

    // Try different possible cookie names
    const sessionToken =
      cookies['better-auth.session_token'] ||
      cookies['session'] ||
      cookies['auth_session']

    if (!sessionToken) {
      // If we can't find the token in cookies, return the session ID from the session object
      // better-auth returns the session with a token/id field
      const token = (session as unknown as { token?: string; id?: string })
        .token || (session as unknown as { token?: string; id?: string }).id

      if (!token) {
        return NextResponse.json(
          { error: 'Session token not found' },
          { status: 500 },
        )
      }

      return NextResponse.json({
        token,
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          login: (session.user as { login?: string }).login,
        },
      })
    }

    return NextResponse.json({
      token: sessionToken,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        login: (session.user as { login?: string }).login,
      },
    })
  } catch (error) {
    console.error('Error getting CLI session:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
