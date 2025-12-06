import { initTRPC, TRPCError } from '@trpc/server'
import { configure } from '@trigger.dev/sdk'
import superjson from 'superjson'
import * as Sentry from '@sentry/nextjs'

import type { Context } from './context.js'
import { getConfig } from '@app/config'

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
})

// Ensure Trigger.dev is configured once per process
let isTriggerConfigured = false

// Middleware to ensure Trigger.dev is configured
const triggerMiddleware = t.middleware(({ ctx, next }) => {
  if (!isTriggerConfigured) {
    try {
      const parsedEnv = getConfig(ctx.env)
      configure({
        secretKey: parsedEnv.TRIGGER_SECRET_KEY,
      })
      isTriggerConfigured = true
    } catch (error) {
      // Log the actual error for debugging in Vercel logs
      console.error('Trigger.dev configuration error:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })

      // Send configuration errors to Sentry
      if (error instanceof Error) {
        Sentry.captureException(error, {
          tags: {
            trpc: true,
            triggerConfig: true,
          },
        })
      }

      // Catch any errors from parseEnv and throw a generic server error
      // This prevents exposing sensitive environment variable names or validation details
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Server configuration error',
      })
    }
  }
  return next()
})

// Middleware for logging
const loggingMiddleware = t.middleware(async ({ next, type, path }) => {
  const result = await next()

  if (!result.ok) {
    // Log detailed error information for Vercel logs
    const error = result.error
    console.error(`[tRPC Error] ${type.toUpperCase()} ${path}:`, {
      code: error.code,
      message: error.message,
      cause: error.cause,
      stack: error.stack,
    })

    // Send error to Sentry with full traceback
    Sentry.captureException(error, {
      tags: {
        trpc: true,
        trpcType: type,
        trpcPath: path,
        errorCode: error.code,
      },
      extra: {
        cause: error.cause,
      },
    })
  }

  return result
})

// Middleware to check if the user is authenticated
const authMiddleware = t.middleware(({ ctx, next }) => {
  // Check if the session and user exist (using the placeholder Session type)
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  // Pass down the context, now including a guaranteed non-null user
  return next({
    ctx: {
      ...ctx,
      // Infers session and user are non-null now based on the check above
      session: ctx.session,
      user: ctx.user,
    },
  })
})

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router
const publicProcedure = t.procedure
  .use(triggerMiddleware)
  .use(loggingMiddleware)
export const protectedProcedure = publicProcedure.use(authMiddleware)
