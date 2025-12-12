import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

import { auth } from '@/lib/auth'
import { storeCliSession } from '@/lib/auth-cli-store'

/**
 * CLI OAuth callback handler.
 * This route is called after GitHub OAuth completes.
 * It validates the state, gets the session, and stores it for CLI retrieval.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const state = searchParams.get('state')

  if (!state) {
    return NextResponse.json({ error: 'Missing state parameter' }, { status: 400 })
  }

  try {
    // Get the session from cookies (Better Auth sets this after OAuth)
    // Forward all headers to Better Auth (including cookies)
    const headersList = await headers()
    const headersForAuth = new Headers()
    for (const [key, value] of headersList.entries()) {
      headersForAuth.set(key, value)
    }

    const sessionResponse = await auth.api.getSession({
      headers: headersForAuth,
    })

    if (!sessionResponse?.data?.session) {
      return NextResponse.json(
        { error: 'No session found. Please complete the OAuth flow.' },
        { status: 401 },
      )
    }

    // Generate a session token (using session ID for simplicity)
    // In production, you might want to use a JWT or other secure token
    const sessionToken = sessionResponse.data.session.id

    // Store the session token for CLI retrieval
    storeCliSession(state, sessionToken)

    // Return success page that the CLI can detect
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Kyoto CLI Login</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .success {
              color: #22c55e;
              font-size: 3rem;
              margin-bottom: 1rem;
            }
            h1 {
              margin: 0 0 0.5rem 0;
              color: #1f2937;
            }
            p {
              color: #6b7280;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✓</div>
            <h1>Login Successful!</h1>
            <p>You can close this window and return to your terminal.</p>
          </div>
        </body>
      </html>
      `,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      },
    )
  } catch (error) {
    console.error('CLI callback error:', error)
    return NextResponse.json(
      { error: 'Failed to complete login' },
      { status: 500 },
    )
  }
}
