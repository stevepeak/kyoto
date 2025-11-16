import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import type { NextRequest } from 'next/server'

import { appRouter } from '@app/api'
import type { Context, Env } from '@app/api'
import { getUser } from '@app/api'
import { setupDb } from '@app/db'
import { getAuth } from '@/lib/auth'

async function createContext(req: NextRequest): Promise<Context> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required')
  }
  const db = setupDb(databaseUrl)
  const auth = getAuth()

  // Get session from better-auth
  // NextRequest extends Request, so we can pass it directly
  let session = null
  try {
    const sessionResponse = await auth.api.getSession({
      headers: req.headers,
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
    // Don't log errors for missing sessions as that's expected for unauthenticated requests
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
}

export async function GET(request: NextRequest) {
  return await fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: () => createContext(request),
  })
}

export async function POST(request: NextRequest) {
  return await fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: () => createContext(request),
  })
}
