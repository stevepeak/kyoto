import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import type { NextRequest } from 'next/server'
import * as Sentry from '@sentry/nextjs'

import { appRouter } from '@app/api'
import type { Context } from '@app/api'
import { getUser } from '@app/api'
import { getConfig } from '@app/config'
import { setupDb } from '@app/db'
import { getAuth } from '@/lib/auth'

async function createContext(req: NextRequest): Promise<Context> {
  // Set up environment variables (validated with Zod)
  const env = getConfig()

  const db = setupDb(env.DATABASE_URL)
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

  return {
    db,
    env,
    session,
    user,
  }
}

function onError({ path, error }: { path?: string; error: unknown }) {
  // Log detailed error information to Vercel logs
  console.error(`[tRPC Error] ${path ?? 'unknown'}:`, {
    message: error instanceof Error ? error.message : String(error),
    code:
      error && typeof error === 'object' && 'code' in error
        ? error.code
        : undefined,
    stack: error instanceof Error ? error.stack : undefined,
    cause: error instanceof Error ? error.cause : undefined,
  })

  // Send error to Sentry with full traceback
  if (error instanceof Error) {
    Sentry.captureException(error, {
      tags: {
        trpc: true,
        trpcPath: path ?? 'unknown',
        errorCode:
          error && typeof error === 'object' && 'code' in error
            ? String(error.code)
            : undefined,
      },
    })
  } else {
    Sentry.captureException(new Error(String(error)), {
      tags: {
        trpc: true,
        trpcPath: path ?? 'unknown',
      },
      extra: {
        originalError: error,
      },
    })
  }
}

export async function GET(request: NextRequest) {
  try {
    return await fetchRequestHandler({
      endpoint: '/api/trpc',
      req: request,
      router: appRouter,
      createContext: () => createContext(request),
      onError,
    })
  } catch (error) {
    // Capture any unhandled errors
    Sentry.captureException(
      error instanceof Error ? error : new Error(String(error)),
    )
    // Ensure Sentry has time to send the error before the function exits
    await Sentry.flush(2000)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    return await fetchRequestHandler({
      endpoint: '/api/trpc',
      req: request,
      router: appRouter,
      createContext: () => createContext(request),
      onError,
    })
  } catch (error) {
    // Capture any unhandled errors
    Sentry.captureException(
      error instanceof Error ? error : new Error(String(error)),
    )
    // Ensure Sentry has time to send the error before the function exits
    await Sentry.flush(2000)
    throw error
  }
}
