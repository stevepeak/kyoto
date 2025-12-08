import posthog from 'posthog-js'

/**
 * Initialize PostHog client
 * Only initializes if not in local development (based on NEXT_PUBLIC_POSTHOG_ENABLED env var)
 */
export function initPostHog(): void {
  // Check if PostHog is enabled via environment variable
  // eslint-disable-next-line no-process-env
  const isEnabled = process.env.NEXT_PUBLIC_POSTHOG_ENABLED === 'true'

  if (!isEnabled) {
    return
  }

  // eslint-disable-next-line no-process-env
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  // eslint-disable-next-line no-process-env
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST

  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.warn('PostHog API key not found')
    return
  }

  if (typeof window !== 'undefined') {
    posthog.init(apiKey, {
      api_host: apiHost ?? 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: false, // We'll manually capture pageviews
      capture_pageleave: true,
    })
  }
}

export { posthog }
