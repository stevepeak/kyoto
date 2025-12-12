import { PostHog } from 'posthog-node'

// Intentionally blank: fill these in locally when you're ready to enable tracking.
const POSTHOG_PROJECT_API_KEY =
  'phc_BmXEmBNzpyLFHZHVtDs6c1l98ihkJlmk4n6xxfqVHgN'
const POSTHOG_HOST = 'https://us.posthog.com'

let client: PostHog | null = null

function getClient(): PostHog | null {
  if (client) {
    return client
  }

  client = new PostHog(POSTHOG_PROJECT_API_KEY, {
    host: POSTHOG_HOST || undefined,
  })

  return client
}

export function captureCliEvent(args: {
  event: string
  distinctId: string
  properties?: Record<string, unknown>
}): void {
  const c = getClient()
  if (!c) return

  c.capture({
    distinctId: args.distinctId,
    event: args.event,
    properties: args.properties ?? {},
  })
}

export async function shutdownCliAnalytics(): Promise<void> {
  if (!client) return

  await client.shutdown()
  client = null
}
