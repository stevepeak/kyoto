import * as Sentry from '@sentry/astro'
import { defineMiddleware } from 'astro:middleware'

import { auth } from './server/auth'

// `context` and `next` are automatically typed
export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url)

  // Skip middleware for static assets and API routes
  // This reduces unnecessary auth checks and improves performance
  if (
    url.pathname.startsWith('/_astro/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/favicon') ||
    /\.(ico|png|jpg|jpeg|svg|webp|woff|woff2|ttf|css|js)$/.test(url.pathname)
  ) {
    return await next()
  }

  const sessionData = await auth.api.getSession({
    headers: context.request.headers,
  })

  const sessionUser = sessionData?.user

  context.locals.userId = sessionUser?.id ?? undefined

  if (sessionUser?.id) {
    Sentry.setUser({
      id: sessionUser.id,
      email: sessionUser.email ?? undefined,
      username: sessionUser.name ?? undefined,
    })
  } else {
    Sentry.setUser(null)
  }

  try {
    return await next()
  } finally {
    Sentry.setUser(null)
  }
})
