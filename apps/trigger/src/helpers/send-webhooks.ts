import { and, createDb, eq, schema } from '@app/db'
import { webhookConfigSchema, type WebhookPayload } from '@app/schemas'
import { logger } from '@trigger.dev/sdk'

type SendWebhooksArgs = {
  databaseUrl: string
  userId: string
  payload: WebhookPayload
}

export async function sendWebhooks(args: SendWebhooksArgs): Promise<void> {
  const { databaseUrl, userId, payload } = args

  const db = createDb({ databaseUrl })

  // Fetch all enabled webhook integrations for the user
  const integrations = await db
    .select()
    .from(schema.integrations)
    .where(
      and(
        eq(schema.integrations.userId, userId),
        eq(schema.integrations.type, 'webhook'),
        eq(schema.integrations.enabled, true),
      ),
    )

  if (integrations.length === 0) {
    logger.log('No enabled webhook integrations found', { userId })
    return
  }

  logger.log('Sending webhooks', {
    userId,
    integrationCount: integrations.length,
    event: payload.event,
  })

  // Send webhooks in parallel
  const results = await Promise.allSettled(
    integrations.map(async (integration) => {
      const config = webhookConfigSchema.parse(integration.config)

      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(
          `Webhook failed with status ${response.status}: ${response.statusText}`,
        )
      }

      return { integrationId: integration.id, status: response.status }
    }),
  )

  // Log results
  results.forEach((result, index) => {
    const integration = integrations[index]
    if (result.status === 'fulfilled') {
      logger.log('Webhook sent successfully', {
        integrationId: integration.id,
        integrationName: integration.name,
        status: result.value.status,
      })
    } else {
      logger.error('Webhook failed', {
        integrationId: integration.id,
        integrationName: integration.name,
        error:
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
      })
    }
  })
}
