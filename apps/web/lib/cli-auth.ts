import { randomBytes } from 'node:crypto'

type PendingCliLogin = {
  redirectUri: string
  createdAtMs: number
}

type CliSession = {
  token: string
  userId: string
  login: string
  createdAtMs: number
}

// NOTE: In-memory only by request (no DB). This is intentionally not durable.
const pendingCliLogins = new Map<string, PendingCliLogin>()
const cliSessions = new Map<string, CliSession>()

const PENDING_TTL_MS = 5 * 60 * 1000
const SESSION_TTL_MS = 24 * 60 * 60 * 1000

function nowMs(): number {
  return Date.now()
}

function pruneExpired(): void {
  const now = nowMs()
  for (const [state, pending] of pendingCliLogins.entries()) {
    if (now - pending.createdAtMs > PENDING_TTL_MS) {
      pendingCliLogins.delete(state)
    }
  }

  for (const [token, session] of cliSessions.entries()) {
    if (now - session.createdAtMs > SESSION_TTL_MS) {
      cliSessions.delete(token)
    }
  }
}

export function validateLoopbackRedirectUri(redirectUri: string): URL {
  const url = new URL(redirectUri)

  if (url.protocol !== 'http:') {
    throw new Error('redirect_uri must use http')
  }

  // Only allow loopback to avoid open-redirect/token exfiltration.
  const host = url.hostname
  const isLoopback =
    host === '127.0.0.1' || host === 'localhost' || host === '::1'

  if (!isLoopback) {
    throw new Error('redirect_uri must target localhost')
  }

  if (!url.port) {
    throw new Error('redirect_uri must include an explicit port')
  }

  return url
}

export function registerPendingCliLogin(args: {
  state: string
  redirectUri: string
}): void {
  pruneExpired()
  pendingCliLogins.set(args.state, {
    redirectUri: args.redirectUri,
    createdAtMs: nowMs(),
  })
}

export function consumePendingCliLogin(args: {
  state: string
}): PendingCliLogin {
  pruneExpired()
  const pending = pendingCliLogins.get(args.state)
  if (!pending) {
    throw new Error('CLI login state not found or expired')
  }
  pendingCliLogins.delete(args.state)
  return pending
}

export function createCliSession(args: {
  userId: string
  login: string
}): CliSession {
  pruneExpired()
  const token = randomBytes(32).toString('base64url')
  const session: CliSession = {
    token,
    userId: args.userId,
    login: args.login,
    createdAtMs: nowMs(),
  }
  cliSessions.set(token, session)
  return session
}

export function getCliSession(args: { token: string }): CliSession | null {
  pruneExpired()
  return cliSessions.get(args.token) ?? null
}
