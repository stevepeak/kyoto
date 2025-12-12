import { cliSessionStore } from '@/lib/cli-store'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const state = searchParams.get('state')

  if (!state) {
    return NextResponse.json({ error: 'Missing state' }, { status: 400 })
  }

  const token = cliSessionStore.get(state)

  if (token) {
    cliSessionStore.delete(state) // One-time use
    return NextResponse.json({ token })
  }

  return NextResponse.json({ error: 'Pending' }, { status: 404 })
}
