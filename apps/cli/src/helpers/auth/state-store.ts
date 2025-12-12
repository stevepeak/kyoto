/**
 * In-memory store for OAuth state tokens.
 * Maps state tokens to promises that resolve with session tokens.
 */
const stateStore = new Map<
  string,
  {
    resolve: (token: string) => void
    reject: (error: Error) => void
    timestamp: number
  }
>()

const STATE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Creates a new state entry and returns the state token.
 */
export function createState(): string {
  const state = crypto.randomUUID()
  let resolve!: (token: string) => void
  let reject!: (error: Error) => void

  const promise = new Promise<string>((res, rej) => {
    resolve = res
    reject = rej
  })

  stateStore.set(state, {
    resolve,
    reject,
    timestamp: Date.now(),
  })

  // Clean up expired states
  cleanupExpiredStates()

  return state
}

/**
 * Resolves a state token with a session token.
 */
export function resolveState(state: string, sessionToken: string): void {
  const entry = stateStore.get(state)
  if (!entry) {
    throw new Error(`Invalid state token: ${state}`)
  }
  stateStore.delete(state)
  entry.resolve(sessionToken)
}

/**
 * Rejects a state token with an error.
 */
export function rejectState(state: string, error: Error): void {
  const entry = stateStore.get(state)
  if (!entry) {
    return
  }
  stateStore.delete(state)
  entry.reject(error)
}

/**
 * Gets the promise for a state token.
 */
export function getStatePromise(state: string): Promise<string> | null {
  const entry = stateStore.get(state)
  if (!entry) {
    return null
  }
  return new Promise((resolve, reject) => {
    entry.resolve = resolve
    entry.reject = reject
  })
}

/**
 * Cleans up expired state entries.
 */
function cleanupExpiredStates(): void {
  const now = Date.now()
  for (const [state, entry] of stateStore.entries()) {
    if (now - entry.timestamp > STATE_TIMEOUT_MS) {
      stateStore.delete(state)
      entry.reject(new Error('State token expired'))
    }
  }
}
