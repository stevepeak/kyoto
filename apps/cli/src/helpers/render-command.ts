import type React from 'react'

import { findGitRoot, getGitHubInfo } from '@app/shell'
import { render } from 'ink'

import { getCliAnalyticsContext } from './analytics/cli-analytics'
import { captureCliEvent, shutdownCliAnalytics } from './analytics/posthog'
import { handleError } from './error-handling/handle-error'
import { createLogger } from './logging/logger'

/**
 * Renders a React command component with analytics tracking and error handling.
 */
export async function renderCommand(args: {
  commandName: string
  commandOptions?: Record<string, unknown>
  element: React.ReactElement
}): Promise<void> {
  const analytics = await getCliAnalyticsContext()

  try {
    const app = render(args.element)
    if (analytics.enabled) {
      // Get GitHub slug for tracking (best effort, don't fail if unavailable)
      let repo: string | undefined
      try {
        const gitRoot = await findGitRoot()
        const githubInfo = await getGitHubInfo(gitRoot)
        if (githubInfo) {
          repo = `${githubInfo.owner}/${githubInfo.repo}`
        }
      } catch {
        // Ignore errors - GitHub info is optional for tracking
      }

      captureCliEvent({
        event: args.commandName,
        distinctId: analytics.distinctId,
        properties: {
          commandOptions: args.commandOptions ?? {},
          repo,
        },
      })
    }
    await app.waitUntilExit()
  } catch (error) {
    // Handle any unhandled errors at the top level
    const logger = createLogger()

    handleError(error, {
      logger,
      setExitCode: (code) => {
        process.exitCode = code
      },
    })
    process.exit(1)
  } finally {
    await shutdownCliAnalytics()
  }
}
