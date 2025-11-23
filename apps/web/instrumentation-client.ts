import posthog from "posthog-js"

// Initialize PostHog on the client. Next.js will automatically pick up this file.
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: "/ingest",
  ui_host: "https://us.posthog.com",
  defaults: '2025-05-24',
  // Enable capturing exceptions using PostHog Error Tracking. Set to false if you don't want this.
  capture_exceptions: true,
  // Enable debug logs in development
  debug: process.env.NODE_ENV === "development",
})