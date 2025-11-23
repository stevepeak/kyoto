import { PostHog as PostHogClient } from 'posthog-node'
import { getConfig } from '@app/config'

let posthogClient: PostHogClient | null = null

/**
 * Get or create PostHog client instance
 */
function getPostHogClient(): PostHogClient | null {
  if (posthogClient) {
    return posthogClient
  }

  try {
    const env = getConfig()
    posthogClient = new PostHogClient(env.POSTHOG_API_KEY, {
      host: env.POSTHOG_HOST,
    })
    return posthogClient
  } catch (error) {
    // If config is not available or PostHog is not configured, return null
    console.warn('PostHog client initialization failed:', error)
    return null
  }
}

/**
 * PostHog event names enum
 * Following the naming convention: event names should be lowercase with underscores
 */
export const POSTHOG_EVENTS = {
  ORGANIZATION_INSTALLED: 'organization_installed',
  USER_CREATED: 'user_created',
  REPO_ADDED: 'repo_added',
  STORY_WRITTEN: 'story_written',
  STORY_EDITED: 'story_edited',
  CI_RUN_FAILED: 'ci_run_failed',
  CI_RUN_PASSED: 'ci_run_passed',
  STORY_GENERATED_TO_ACCEPTED: 'story_generated_to_accepted',
} as const

/**
 * Capture a PostHog event on the server side
 * @param eventName - The name of the event
 * @param properties - Event properties
 * @param distinctId - Optional distinct ID (user ID). If not provided, won't track user identity
 */
export function capturePostHogEvent(
  eventName: string,
  properties?: Record<string, unknown>,
  distinctId?: string,
): void {
  const client = getPostHogClient()
  if (!client) {
    return
  }

  try {
    if (distinctId) {
      client.capture({
        distinctId,
        event: eventName,
        properties: properties ?? {},
      })
    } else {
      client.capture({
        distinctId: 'anonymous',
        event: eventName,
        properties: properties ?? {},
      })
    }
  } catch (error) {
    console.error('Failed to capture PostHog event:', error)
  }
}

/**
 * Shutdown PostHog client gracefully
 * Should be called when the application is shutting down
 */
export async function shutdownPostHog(): Promise<void> {
  if (posthogClient) {
    await posthogClient.shutdown()
    posthogClient = null
  }
}
