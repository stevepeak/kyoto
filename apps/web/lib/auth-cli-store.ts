/**
 * In-memory store for CLI OAuth state tokens.
 * Maps state tokens to session tokens for CLI authentication.
 * This is temporary storage - tokens expire after 5 minutes.
 */
const cliStateStore = new Map<
  string,
  {
    sessionToken: string
    timestamp: number
  }
>()

const STATE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Stores a session token for a given state.
 */
export function storeCliSession(state: string, sessionToken: string): void {
  cliStateStore.set(state, {
    sessionToken,
    timestamp: Date.now(),
  })
  cleanupExpiredStates()
}

/**
 * Retrieves a session token for a given state.
 * Returns null if state is invalid or expired.
 */
export function getCliSession(state: string): string | null {
  const entry = cliStateStore.get(state)
  if (!entry) {
    return null
  }

  // Check if expired
  if (Date.now() - entry.timestamp > STATE_TIMEOUT_MS) {
    cliStateStore.delete(state)
    return null
  }

  return entry.sessionToken
}

/**
 * Cleans up expired state entries.
 */
function cleanupExpiredStates(): void {
  const now = Date.now()
  for (const [state, entry] of cliStateStore.entries()) {
    if (now - entry.timestamp > STATE_TIMEOUT_MS) {
      cliStateStore.delete(state)
    }
  }
}
