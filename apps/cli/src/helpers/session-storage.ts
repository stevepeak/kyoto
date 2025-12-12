/**
 * In-memory session storage for CLI authentication
 * 
 * This uses a Map to store session tokens in memory.
 * For testing purposes only - tokens are lost when the process exits.
 * 
 * @example
 * ```typescript
 * // Store a session after login
 * storeSession('your-session-token')
 * 
 * // Check if user is logged in
 * if (hasSession()) {
 *   const token = getSession()
 *   // Use the token for API calls
 * }
 * 
 * // Clear session on logout
 * clearSession()
 * ```
 */

const sessionStore = new Map<string, string>()
const SESSION_KEY = 'kyoto_cli_session'

/**
 * Store a session token in memory
 * @param token - The session token to store
 */
export function storeSession(token: string): void {
  sessionStore.set(SESSION_KEY, token)
}

/**
 * Get the current session token
 * @returns The session token if it exists, undefined otherwise
 */
export function getSession(): string | undefined {
  return sessionStore.get(SESSION_KEY)
}

/**
 * Check if a session exists
 * @returns true if a session exists, false otherwise
 */
export function hasSession(): boolean {
  return sessionStore.has(SESSION_KEY)
}

/**
 * Clear the current session
 */
export function clearSession(): void {
  sessionStore.delete(SESSION_KEY)
}

/**
 * Get all sessions (for debugging/testing purposes)
 * @returns A Map containing all sessions
 */
export function getAllSessions(): Map<string, string> {
  return new Map(sessionStore)
}
