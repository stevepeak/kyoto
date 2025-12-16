import { sentryEsbuildPlugin } from '@sentry/esbuild-plugin'
import * as Sentry from '@sentry/node'
import {
  type BuildExtension,
  esbuildPlugin,
} from '@trigger.dev/build/extensions'
import { defineConfig, tasks } from '@trigger.dev/sdk'

import { setupTelemetry } from './src/telemetry'

export default defineConfig({
  // Your project ref (you can see it on the Project settings page in the dashboard)
  // eslint-disable-next-line no-process-env
  project: process.env.TRIGGER_PROJECT_ID || 'proj_krmnzhlblfvcussrwlyu',
  // The paths for your trigger folders
  dirs: ['./src/tasks'],
  build: {
    // Don't bundle these - they have issues when bundled
    external: ['@browserbasehq/stagehand'],
    extensions: [
      esbuildPlugin(
        sentryEsbuildPlugin({
          org: 'kyoto',
          project: 'trigger',
          // Find this auth token in settings -> developer settings -> auth tokens
          // eslint-disable-next-line no-process-env
          authToken: process.env.SENTRY_AUTH_TOKEN,
        }),
        { placement: 'last', target: 'deploy' },
      ) as BuildExtension,
    ],
  },
  init: async () => {
    await setupTelemetry()
  },
  onFailure: ({ payload, error, ctx }) => {
    Sentry.captureException(error, {
      extra: {
        payload,
        ctx,
      },
    })
  },
  // Default retry settings
  retries: {
    // If you want to retry a task in dev mode (when using the CLI)
    enabledInDev: false,
    // The default retry settings. Used if you don't specify on a task.
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  // Max duration for all tasks (in seconds)
  maxDuration: 60 * 15, // 15 minute
})

tasks.onStartAttempt(({ ctx }) => {
  const sha = ctx.deployment?.git?.commitSha
  if (sha) {
    Sentry.setTag('release', sha)
  }
})
