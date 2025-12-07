import { getConfig } from '@app/config'
import { setupDb } from '@app/db'
import { capturePostHogEvent, POSTHOG_EVENTS } from '@app/posthog'
import { logger } from '@trigger.dev/sdk'

import {
  disableRepositories,
  ensureOwnerMemberships,
  ensureRepoMemberships,
  findRepoIdsByNames,
  findUserIdsByGithubAccountId,
  listOwnerMemberUserIds,
  removeRepoMemberships,
  upsertRepositories,
} from '../shared/db'
import { installationRepositoriesEventSchema } from '../shared/schemas'
import { parseId } from '../shared/utils'
import { type WebhookHandler } from '../types'

export const installationRepositoriesHandler: WebhookHandler = async ({
  deliveryId,
  rawPayload,
}) => {
  const parsed = installationRepositoriesEventSchema.parse(rawPayload)
  const installationId = parseId(parsed.installation.id, 'installation.id')
  const installationIdValue = installationId.toString()

  const env = getConfig()
  const db = setupDb(env.DATABASE_URL)

  try {
    const owner = await db
      .selectFrom('owners')
      .select(['id', 'login'])
      .where('installationId', '=', installationIdValue)
      .executeTakeFirst()

    if (!owner) {
      logger.warn('Owner not found for installation_repositories event', {
        deliveryId,
        installationId: installationIdValue,
      })

      return
    }

    const repositoriesAdded = parsed.repositories_added ?? []
    const repositoriesRemoved = parsed.repositories_removed ?? []

    const senderUserIds = await findUserIdsByGithubAccountId(
      db,
      parsed.sender?.id ?? null,
    )

    if (senderUserIds.length > 0) {
      await ensureOwnerMemberships(db, {
        ownerId: owner.id,
        userIds: senderUserIds,
        role: 'admin',
      })
    } else {
      logger.info('No matching local users for GitHub sender on repo event', {
        deliveryId,
        senderLogin: parsed.sender?.login ?? null,
        senderId: parsed.sender?.id ?? null,
      })
    }

    if (repositoriesAdded.length > 0) {
      await upsertRepositories(db, {
        ownerId: owner.id,
        repositories: repositoriesAdded,
        enabled: true,
      })

      const memberUserIds = await listOwnerMemberUserIds(db, owner.id)
      const repoIds = await findRepoIdsByNames(db, {
        ownerId: owner.id,
        repoNames: repositoriesAdded.map((repo) => repo.name),
      })

      if (memberUserIds.length > 0 && repoIds.length > 0) {
        await ensureRepoMemberships(db, {
          repoIds,
          userIds: memberUserIds,
        })
      }

      // Track repo added event for each repository
      const firstUserId = memberUserIds[0] ?? senderUserIds[0]
      if (firstUserId) {
        for (const repo of repositoriesAdded) {
          capturePostHogEvent(
            POSTHOG_EVENTS.REPO_ADDED,
            {
              owner_id: owner.id,
              owner_login: owner.login,
              repo_name: repo.name,
              repo_full_name: repo.full_name ?? null,
              repo_private: repo.private ?? false,
              installation_id: installationIdValue,
            },
            firstUserId,
          )
        }
      }
    }

    if (repositoriesRemoved.length > 0) {
      await disableRepositories(db, {
        ownerId: owner.id,
        repositories: repositoriesRemoved,
      })

      const repoIds = await findRepoIdsByNames(db, {
        ownerId: owner.id,
        repoNames: repositoriesRemoved.map((repo) => repo.name),
      })

      if (repoIds.length > 0) {
        await removeRepoMemberships(db, {
          repoIds,
        })
      }
    }

    logger.info('Processed installation_repositories event', {
      deliveryId,
      action: parsed.action,
      installationId: installationIdValue,
      ownerLogin: owner.login,
      repositoriesAdded: repositoriesAdded.length,
      repositoriesRemoved: repositoriesRemoved.length,
    })
  } finally {
    await db.destroy()
  }
}
