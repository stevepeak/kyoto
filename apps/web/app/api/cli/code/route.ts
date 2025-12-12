import { auth } from '@/lib/auth'
import { cliSessionStore } from '@/lib/cli-store'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { state } = body

    if (!state || typeof state !== 'string') {
      return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
    }

    const headersList = await headers()
    const session = await auth.api.getSession({
      headers: headersList,
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to get token from session object or cookie
    // better-auth session usually contains the token
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let token = (session.session as any).token

    if (!token) {
      // Fallback to cookie
      const cookieHeader = headersList.get('cookie')
      if (cookieHeader) {
        const match = cookieHeader.match(/better-auth\.session_token=([^;]+)/)
        if (match) {
          token = match[1]
        }
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Session token not found' },
        { status: 500 },
      )
    }

    cliSessionStore.set(state, token)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('CLI Code Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
