import { headers } from 'next/headers'
import { cache } from 'react'

import { appRouter } from '@app/api'
import type { Context, Env } from '@app/api'
import { getUser } from '@app/api'
import { setupDb } from '@app/db'
import { getAuth } from '@/lib/auth'

/**
 * Create tRPC context for Server Components
 * Uses React cache to deduplicate requests
 */
const createContext = cache(async (): Promise<Context> => {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required')
  }
  const db = setupDb(databaseUrl)
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

  // Set up environment variables
  const env: Env = {
    siteBaseUrl: process.env.SITE_BASE_URL || 'http://localhost:3001',
    githubAppId: process.env.GITHUB_APP_ID || '',
    githubAppPrivateKey: process.env.GITHUB_APP_PRIVATE_KEY || '',
    githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
    openAiApiKey: process.env.OPENAI_API_KEY || '',
    databaseUrl: process.env.DATABASE_URL || '',
    triggerSecretKey: process.env.TRIGGER_SECRET_KEY || '',
    context7ApiKey: process.env.CONTEXT7_API_KEY,
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
  return appRouter.createCaller(ctx)
}
