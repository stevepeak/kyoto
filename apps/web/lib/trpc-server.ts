import { headers } from 'next/headers'
import { cache } from 'react'

import { appRouter } from '@app/api'
import type { Context } from '@app/api'
import { getUser } from '@app/api'
import { getConfig } from '@app/config'
import { setupDb } from '@app/db'
import { getAuth } from '@/lib/auth'

/**
 * Create tRPC context for Server Components
 * Uses React cache to deduplicate requests
 */
const createContext = cache(async (): Promise<Context> => {
  // Set up environment variables (validated with Zod)
  const env = getConfig()

  const db = setupDb(env.DATABASE_URL)
  const auth = getAuth()

  // Get session from better-auth
  const headersList = await headers()
  // better-auth's getSession expects a Headers-like object
  // Next.js headers() returns ReadonlyHeaders, so we create a mutable Headers object
  const headersForAuth = new Headers()
  for (const [key, value] of headersList.entries()) {
    headersForAuth.set(key, value)
  }

  let session = null
  try {
    const sessionResponse = await auth.api.getSession({
      headers: headersForAuth,
    })

    session = sessionResponse
      ? {
          user: sessionResponse.user
            ? {
                id: sessionResponse.user.id,
              }
            : null,
        }
      : null
  } catch (_error) {
    // Session might not exist, that's okay
  }

  // Get user from database if session exists
  let user = null
  if (session?.user?.id) {
    try {
      user = await getUser({ db, userId: session.user.id })
    } catch (error) {
      // User might not exist in database yet, that's okay
      console.error('Failed to get user from database:', error)
    }
  }

  return {
    db,
    env,
    session,
    user,
  }
})

/**
 * Get server-side tRPC caller for use in Server Components
 */
export async function getTRPCCaller() {
  const ctx = await createContext()
  const caller = appRouter.createCaller(ctx)
  return caller
}
