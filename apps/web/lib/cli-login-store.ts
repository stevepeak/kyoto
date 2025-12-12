import crypto from 'node:crypto'

export type CliLoginStatus = 'pending' | 'complete' | 'expired'

export interface CliLoginUserInfo {
  id: string
  login: string
  name: string | null
  email: string | null
  image: string | null
}

interface CliLoginEntry {
  loginId: string
  browserToken: string
  pollToken: string
  createdAtMs: number
  expiresAtMs: number
  status: CliLoginStatus
  sessionToken?: string
  user?: CliLoginUserInfo
}

// NOTE: In-memory only (requested for tight testing integration).
const store = new Map<string, CliLoginEntry>()

const DEFAULT_TTL_MS = 10 * 60 * 1000 // 10 minutes

function nowMs(): number {
  return Date.now()
}

function cleanupExpired(): void {
  const now = nowMs()
  for (const [loginId, entry] of store.entries()) {
    if (entry.expiresAtMs <= now) {
      store.delete(loginId)
    }
  }
}

export function createCliLogin(args?: { ttlMs?: number }): {
  loginId: string
  browserToken: string
  pollToken: string
  expiresAtMs: number
} {
  cleanupExpired()

  const ttlMs = args?.ttlMs ?? DEFAULT_TTL_MS
  const createdAtMs = nowMs()
  const expiresAtMs = createdAtMs + ttlMs

  const loginId = crypto.randomUUID()
  const browserToken = crypto.randomUUID()
  const pollToken = crypto.randomUUID()

  store.set(loginId, {
    loginId,
    browserToken,
    pollToken,
    createdAtMs,
    expiresAtMs,
    status: 'pending',
  })

  return { loginId, browserToken, pollToken, expiresAtMs }
}

export function getCliLoginStatus(args: {
  loginId: string
  pollToken: string
}):
  | { status: 'pending' | 'expired' }
  | { status: 'complete'; sessionToken: string; user: CliLoginUserInfo } {
  cleanupExpired()

  const entry = store.get(args.loginId)
  if (!entry) {
    return { status: 'expired' }
  }

  if (entry.pollToken !== args.pollToken) {
    return { status: 'expired' }
  }

  if (entry.status !== 'complete' || !entry.sessionToken || !entry.user) {
    return { status: 'pending' }
  }

  return { status: 'complete', sessionToken: entry.sessionToken, user: entry.user }
}

export function completeCliLogin(args: {
  loginId: string
  browserToken: string
  user: CliLoginUserInfo
}): { sessionToken: string } | { status: 'expired' } {
  cleanupExpired()

  const entry = store.get(args.loginId)
  if (!entry) {
    return { status: 'expired' }
  }

  if (entry.browserToken !== args.browserToken) {
    return { status: 'expired' }
  }

  const sessionToken = `kyoto_cli_${crypto.randomUUID()}`
  entry.status = 'complete'
  entry.sessionToken = sessionToken
  entry.user = args.user
  store.set(args.loginId, entry)

  return { sessionToken }
}

export function consumeCliLogin(args: {
  loginId: string
  pollToken: string
}):
  | { status: 'pending' | 'expired' }
  | { status: 'complete'; sessionToken: string; user: CliLoginUserInfo } {
  const status = getCliLoginStatus(args)
  if (status.status !== 'complete') {
    return status
  }

  // One-time delivery to the CLI.
  store.delete(args.loginId)
  return status
}

