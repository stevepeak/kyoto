import { logger } from '@trigger.dev/sdk'

import { statusEventSchema } from '../shared/schemas'
import type { WebhookHandler } from '../types'

export const statusHandler: WebhookHandler = ({
  deliveryId,
  rawPayload,
}) => {
  const parsed = statusEventSchema.safeParse(rawPayload)

  if (!parsed.success) {
    logger.error('Failed to parse status event payload', {
      deliveryId,
      issues: parsed.error.issues,
    })
    return Promise.resolve()
  }

  if (parsed.data.context === 'Versaille') {
    const stagingUrl = parsed.data.target_url
    logger.info('Versaille status check detected', {
      deliveryId,
      stagingUrl,
      state: parsed.data.state,
      sha: parsed.data.sha,
    })
  }

  return Promise.resolve()
}
