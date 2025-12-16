import { z } from 'zod'

export const webhookEventSchema = z.enum(['run.completed', 'run.failed'])

export type WebhookEvent = z.infer<typeof webhookEventSchema>

export const webhookStorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
})

export type WebhookStory = z.infer<typeof webhookStorySchema>

export const webhookRunSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  createdAt: z.string(), // ISO 8601
  error: z.string().nullable(),
  sessionRecordingUrl: z.string().nullable(),
  observations: z.unknown().nullable(),
})

export type WebhookRun = z.infer<typeof webhookRunSchema>

export const webhookPayloadSchema = z.object({
  event: webhookEventSchema,
  timestamp: z.string(), // ISO 8601
  story: webhookStorySchema,
  run: webhookRunSchema,
})

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>

// Config schema for webhook integrations stored in the database
export const webhookConfigSchema = z.object({
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
})

export type WebhookConfig = z.infer<typeof webhookConfigSchema>

// Sample payload for demo/preview purposes
export function createSampleWebhookPayload(): WebhookPayload {
  return {
    event: 'run.completed',
    timestamp: new Date().toISOString(),
    story: {
      id: '00000000-0000-0000-0000-000000000000',
      name: 'Example Story - User Login Flow',
    },
    run: {
      id: '11111111-1111-1111-1111-111111111111',
      status: 'completed',
      createdAt: new Date().toISOString(),
      error: null,
      sessionRecordingUrl: 'https://app.browserbase.com/sessions/example',
      observations: {
        steps: [
          { action: 'navigate', url: 'https://example.com/login' },
          { action: 'fill', selector: '#email', value: 'user@example.com' },
          { action: 'click', selector: '#submit' },
          { action: 'verify', text: 'Welcome back!' },
        ],
      },
    },
  }
}
