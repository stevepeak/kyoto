import { getConfig } from '@app/config'
import { PostHog as PostHogClient } from 'posthog-node'

let posthogClient: PostHogClient | null = null

/**
 * Get or create PostHog client instance
 */
function getPostHogClient(): PostHogClient | null {
  // Skip PostHog in local development
  // eslint-disable-next-line no-process-env
  if (process.env.NODE_ENV === 'development') {
    return null
  }

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
    // eslint-disable-next-line no-console
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
  STORY_CREATED: 'story_created',
  STORY_EDITED: 'story_edited',
  STORY_RUN_MANUAL: 'story_run_manual',
  SECURITY_AUDIT_CREATED: 'security_audit_created',
  SECURITY_AUDIT_EDITED: 'security_audit_edited',
  SECURITY_AUDIT_DELETED: 'security_audit_deleted',
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
    // eslint-disable-next-line no-console
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
