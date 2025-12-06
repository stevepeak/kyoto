/* eslint-disable no-process-env */

import * as Sentry from '@sentry/bun'

// Ensure to call this before importing any other modules!
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'development',
  tracesSampleRate: 1.0,
  release: process.env.COMMIT_SHA,
  integrations(integrations) {
    return [
      Sentry.extraErrorDataIntegration(),
      ...integrations.filter(
        (integration) =>
          integration.name !== 'BunServer' && integration.name !== 'Http',
      ),
    ]
  },
})
