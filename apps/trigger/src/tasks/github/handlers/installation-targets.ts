import { getConfig } from '@app/config'
import { createDb, eq, schema } from '@app/db'
import { logger } from '@trigger.dev/sdk'

import { installationTargetsEventSchema } from '../shared/schemas'
import { parseId } from '../shared/utils'
import { type WebhookHandler } from '../types'

export const installationTargetsHandler: WebhookHandler = async ({
  deliveryId,
  rawPayload,
}) => {
  const data = installationTargetsEventSchema.parse(rawPayload)
  const action = data.action.toLowerCase()

  if (action !== 'renamed') {
    logger.info('Ignoring installation_targets action', {
      deliveryId,
      action,
    })
    return
  }

  const installationId = parseId(data.installation.id, 'installation.id')
  const newLogin = data.account.login
  const oldLogin = data.changes?.login?.from

  if (!oldLogin) {
    logger.warn('Missing old login in installation_targets rename event', {
      deliveryId,
      installationId: installationId.toString(),
      newLogin,
    })
    return
  }

  const env = getConfig()
  const db = createDb({ databaseUrl: env.DATABASE_URL })

  try {
    // Find the owner by installation ID
    const ownerResult = await db
      .select({ id: schema.owners.id, login: schema.owners.login })
      .from(schema.owners)
      .where(
        eq(schema.owners.installationId, Number(installationId.toString())),
      )
      .limit(1)

    const owner = ownerResult[0]

    if (!owner) {
      logger.warn('Owner not found for installation_targets event', {
        deliveryId,
        installationId: installationId.toString(),
        oldLogin,
        newLogin,
      })
      return
    }

    // Verify the old login matches (safety check)
    if (owner.login.toLowerCase() !== oldLogin.toLowerCase()) {
      logger.warn('Owner login mismatch in installation_targets rename event', {
        deliveryId,
        installationId: installationId.toString(),
        expectedLogin: owner.login,
        oldLogin,
        newLogin,
      })
      return
    }

    // Update the owner's login
    await db
      .update(schema.owners)
      .set({
        login: newLogin,
        name: data.account.name ?? null,
        avatarUrl: data.account.avatar_url ?? null,
        htmlUrl: data.account.html_url ?? null,
      })
      .where(eq(schema.owners.id, owner.id))

    logger.info('Updated owner login from installation_targets rename event', {
      deliveryId,
      installationId: installationId.toString(),
      ownerId: owner.id,
      oldLogin,
      newLogin,
    })
  } catch (error) {
    logger.error(
      'Failed to update owner login from installation_targets event',
      {
        deliveryId,
        installationId: installationId.toString(),
        oldLogin,
        newLogin,
        error,
      },
    )
    throw error
  } finally {
    await db.$client.end()
  }
}
