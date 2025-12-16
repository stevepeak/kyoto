import { getUserGithubLogin } from '@app/api'
import { eq, schema, sql } from '@app/db'
import { randomBytes } from 'node:crypto'

import { db } from '@/lib/db'

type PendingCliLogin = {
  redirectUri: string
  createdAtMs: number
}

type CliSession = {
  token: string
  userId: string
  login: string
  openrouterApiKey: string
  createdAtMs: number
}

const PENDING_TTL_MS = 5 * 60 * 1000
const SESSION_TTL_MS = 24 * 60 * 60 * 1000

function nowMs(): number {
  return Date.now()
}

async function pruneExpired(): Promise<void> {
  // Best-effort DB cleanup. This should never block login flows.
  // Use Postgres `now()` to avoid any driver-specific JS Date parameter issues.
  try {
    await db
      .delete(schema.cliAuthState)
      .where(sql`${schema.cliAuthState.expiresAt} < now()`)
  } catch {
    // Intentionally ignored.
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

export async function registerPendingCliLogin(args: {
  state: string
  redirectUri: string
}): Promise<void> {
  await pruneExpired()

  const expiresAt = new Date(nowMs() + PENDING_TTL_MS)
  await db
    .insert(schema.cliAuthState)
    .values({
      stateToken: args.state,
      redirectUri: args.redirectUri,
      expiresAt,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.cliAuthState.stateToken,
      set: {
        redirectUri: args.redirectUri,
        expiresAt,
        updatedAt: new Date(),
      },
    })
}

export async function consumePendingCliLogin(args: {
  state: string
}): Promise<PendingCliLogin> {
  const row = await db.query.cliAuthState.findFirst({
    where: eq(schema.cliAuthState.stateToken, args.state),
    columns: {
      redirectUri: true,
      expiresAt: true,
      createdAt: true,
    },
  })

  if (!row?.redirectUri) {
    throw new Error('CLI login state not found or expired')
  }

  // Check expiration
  const expiresAtMs = row.expiresAt.getTime()
  if (Date.now() > expiresAtMs) {
    throw new Error('CLI login state not found or expired')
  }

  // Delete the consumed state
  await db
    .delete(schema.cliAuthState)
    .where(eq(schema.cliAuthState.stateToken, args.state))

  return {
    redirectUri: row.redirectUri,
    createdAtMs: row.createdAt.getTime(),
  }
}

export async function createCliSession(args: {
  state: string
  userId: string
  login: string
  openrouterApiKey: string
}): Promise<CliSession> {
  await pruneExpired()
  const token = randomBytes(32).toString('base64url')
  const createdAtMs = nowMs()

  const expiresAt = new Date(createdAtMs + SESSION_TTL_MS)
  await db
    .insert(schema.cliAuthState)
    .values({
      stateToken: args.state,
      sessionToken: token,
      userId: args.userId,
      openrouterApiKey: args.openrouterApiKey,
      expiresAt,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.cliAuthState.stateToken,
      set: {
        sessionToken: token,
        userId: args.userId,
        openrouterApiKey: args.openrouterApiKey,
        expiresAt,
        updatedAt: new Date(),
      },
    })

  return {
    token,
    userId: args.userId,
    login: args.login,
    openrouterApiKey: args.openrouterApiKey,
    createdAtMs,
  }
}

export async function getCliSession(args: {
  token: string
}): Promise<CliSession | null> {
  await pruneExpired()
  const row = await db.query.cliAuthState.findFirst({
    where: eq(schema.cliAuthState.sessionToken, args.token),
    columns: {
      sessionToken: true,
      userId: true,
      openrouterApiKey: true,
      createdAt: true,
      expiresAt: true,
    },
  })

  if (!row?.sessionToken || !row.userId || !row.openrouterApiKey) {
    return null
  }

  const expiresAtMs = row.expiresAt.getTime()
  if (Date.now() > expiresAtMs) {
    return null
  }

  // Query user table to get login
  const user = await db.query.user.findFirst({
    where: eq(schema.user.id, row.userId),
    columns: {
      login: true,
    },
  })

  // If login is not in user table, try to resolve it from GitHub
  let login = user?.login ?? ''
  if (!login) {
    const githubLogin = await getUserGithubLogin({
      db,
      userId: row.userId,
    })
    login = githubLogin ?? ''
  }

  return {
    token: row.sessionToken,
    userId: row.userId,
    login,
    openrouterApiKey: row.openrouterApiKey,
    createdAtMs: row.createdAt.getTime(),
  }
}
