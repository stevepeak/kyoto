import { type NextRequest, NextResponse } from 'next/server'

import { cliAuthStore } from '@/lib/cli-auth-store'

/**
 * API route to initialize a CLI session
 * POST /api/cli/init
 * Body: { state: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { state?: string }
    const { state } = body

    if (!state || typeof state !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid state parameter' },
        { status: 400 },
      )
    }

    // Validate state token format (should be 64 hex chars)
    if (!/^[a-f0-9]{64}$/i.test(state)) {
      return NextResponse.json(
        { error: 'Invalid state token format' },
        { status: 400 },
      )
    }

    // Create the CLI session
    cliAuthStore.createSession(state)

    return NextResponse.json({ success: true })
  } catch (error) {
    // Log error for debugging but don't expose details
    if (error instanceof Error) {
      // In development, you could log: console.error('Error initializing CLI session:', error)
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
