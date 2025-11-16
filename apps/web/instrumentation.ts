// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs')

    Sentry.init({
      dsn: process.env.SENTRY_DSN,

      // Adjust this value in production, or use tracesSampler for greater control
      tracesSampleRate: 1.0,

      // Setting this option to true will print useful information to the console while you're setting up Sentry.
      debug: false,

      // Set release to commit SHA from Vercel deployments
      ...(process.env.VERCEL_GIT_COMMIT_SHA
        ? { release: process.env.VERCEL_GIT_COMMIT_SHA }
        : {}),

      // Uncomment the line below to enable Spotlight (https://spotlightjs.com)
      // spotlight: process.env.NODE_ENV === 'development',
    })
  }
}

export async function onRequestError(
  err: Error,
  request: {
    path: string
    headers: Headers
    method: string
  },
) {
  const Sentry = await import('@sentry/nextjs')
  // Convert Headers to plain object for Sentry
  const headersObj: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    headersObj[key] = value
  })

  Sentry.captureException(err, {
    tags: {
      requestError: true,
      path: request.path,
      method: request.method,
    },
    extra: {
      headers: headersObj,
    },
  })
}
