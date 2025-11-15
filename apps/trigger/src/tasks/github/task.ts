import { logger, task } from '@trigger.dev/sdk'

import { installationHandler } from './handlers/installation'
import { installationRepositoriesHandler } from './handlers/installation-repositories'
import { installationTargetsHandler } from './handlers/installation-targets'
import { pullRequestHandler } from './handlers/pull-request'
import { pushHandler } from './handlers/push'
import type { WebhookHandler } from './types'

const handlers: Record<string, WebhookHandler | null> = {
  push: pushHandler,
  pull_request: pullRequestHandler,
  installation: installationHandler,
  installation_repositories: installationRepositoriesHandler,
  installation_targets: installationTargetsHandler,
  // * Events we may want to listen to in the future
  repository: null,
  check_run: null,
  check_suite: null,
  status: null,
  branch_protection_rule: null,
  create: null,
  delete: null,
  meta: null,
  public: null,
  private: null,
  repository_vulnerability_alert: null,
  release: null,
}

export const supportedEventTypes = new Set(
  Object.entries(handlers)
    .filter(([, handler]) => handler !== null)
    .map(([eventType]) => eventType),
)

export const handleGithubWebhookTask = task({
  id: 'handle-github-webhook',
  run: async (payload: {
    eventType: string
    deliveryId: string
    payload: unknown
  }) => {
    logger.info('Handling GitHub webhook', {
      eventType: payload.eventType,
      deliveryId: payload.deliveryId,
      payload: payload.payload,
    })

    const handler = handlers[payload.eventType]

    if (!handler) {
      logger.info('Unhandled webhook event type', {
        eventType: payload.eventType,
        deliveryId: payload.deliveryId,
      })
    } else {
      await handler({
        deliveryId: payload.deliveryId,
        rawPayload: payload.payload,
      })
    }

    return {
      success: true,
      eventType: payload.eventType,
      deliveryId: payload.deliveryId,
    }
  },
})
