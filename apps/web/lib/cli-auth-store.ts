/**
 * In-memory store for CLI authentication sessions
 * This is used to bridge the CLI login flow with the web OAuth callback
 *
 * Flow:
 * 1. CLI generates a state token and opens browser to /cli/login?state=xxx
 * 2. Web stores the state in this map with status 'pending'
 * 3. User completes GitHub OAuth
 * 4. OAuth callback updates the state with the session token
 * 5. CLI polls /api/cli/session?state=xxx to get the token
 */

interface CliAuthSession {
  state: string
  status: 'pending' | 'completed' | 'failed'
  sessionToken?: string
  user?: {
    name: string
    login: string
  }
  createdAt: Date
  expiresAt: Date
}

class CliAuthStore {
  private sessions = new Map<string, CliAuthSession>()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    // Clean up expired sessions every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60 * 1000)
  }

  /**
   * Create a new pending CLI session
   */
  createSession(state: string): void {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000) // 5 minutes

    this.sessions.set(state, {
      state,
      status: 'pending',
      createdAt: now,
      expiresAt,
    })
  }

  /**
   * Complete a CLI session with the session token
   */
  completeSession(
    state: string,
    sessionToken: string,
    user: { name: string; login: string },
  ): void {
    const session = this.sessions.get(state)
    if (!session) {
      throw new Error('Session not found')
    }

    if (new Date() > session.expiresAt) {
      this.sessions.delete(state)
      throw new Error('Session expired')
    }

    session.status = 'completed'
    session.sessionToken = sessionToken
    session.user = user
  }

  /**
   * Get a CLI session by state token
   */
  getSession(state: string): CliAuthSession | undefined {
    const session = this.sessions.get(state)
    if (!session) {
      return undefined
    }

    // Check if expired
    if (new Date() > session.expiresAt) {
      this.sessions.delete(state)
      return undefined
    }

    return session
  }

  /**
   * Delete a session after it's been consumed
   */
  deleteSession(state: string): void {
    this.sessions.delete(state)
  }

  /**
   * Clean up expired sessions
   */
  private cleanup(): void {
    const now = new Date()
    for (const [state, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(state)
      }
    }
  }

  /**
   * Get stats for debugging
   */
  getStats(): {
    totalSessions: number
    pendingSessions: number
    completedSessions: number
  } {
    const sessions = Array.from(this.sessions.values())
    return {
      totalSessions: sessions.length,
      pendingSessions: sessions.filter((s) => s.status === 'pending').length,
      completedSessions: sessions.filter((s) => s.status === 'completed')
        .length,
    }
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.sessions.clear()
  }
}

// Singleton instance
export const cliAuthStore = new CliAuthStore()

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    cliAuthStore.destroy()
  })
}
