import { parseEnv } from '@app/agents'
import { setupDb } from '@app/db'
import { task, logger } from '@trigger.dev/sdk'
import { z } from 'zod'

type DbClient = ReturnType<typeof setupDb>

const idSchema = z.union([z.number().int(), z.string(), z.bigint()])

const accountSchema = z
  .object({
    login: z.string(),
    id: idSchema.optional(),
    name: z.string().optional(),
    type: z.string().optional(),
    avatar_url: z.string().optional(),
    html_url: z.string().optional(),
  })
  .passthrough()

const repositorySchema = z.object({
  id: idSchema.optional(),
  name: z.string(),
  full_name: z.string().optional(),
  private: z.boolean().optional(),
  description: z.string().nullable().optional(),
  default_branch: z.string().nullable().optional(),
  html_url: z.string().nullable().optional(),
})

const installationEventSchema = z.object({
  action: z.string(),
  installation: z.object({
    id: idSchema,
    account: accountSchema,
  }),
  repositories: z.array(repositorySchema).optional(),
})

const installationRepositoriesEventSchema = z.object({
  action: z.enum(['added', 'removed']),
  installation: z.object({
    id: idSchema,
  }),
  repositories_added: z.array(repositorySchema).optional(),
  repositories_removed: z.array(repositorySchema).optional(),
})

type AccountPayload = z.infer<typeof accountSchema>
type RepositoryPayload = z.infer<typeof repositorySchema>
function parseId(value: z.infer<typeof idSchema>, field: string): bigint {
  try {
    return BigInt(String(value))
  } catch (error) {
    throw new TypeError(`Invalid ${field}: ${String(value)}`, {
      cause: error instanceof Error ? error : undefined,
    })
  }
}

function toNullableString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
}

function resolveAccountExternalId(account: AccountPayload): bigint | null {
  if (account.id === undefined) {
    return null
  }

  try {
    return parseId(account.id, 'account.id')
  } catch (error) {
    logger.warn('Unable to parse account external id', {
      error,
      accountId: account.id,
      login: account.login,
    })
  }

  return null
}

async function upsertOwnerRecord(
  db: DbClient,
  params: {
    account: AccountPayload
    installationId: bigint
  },
): Promise<{ id: string; login: string }> {
  const accountName = toNullableString(params.account.name ?? null)
  const accountType = toNullableString(params.account.type ?? null)
  const avatarUrl = toNullableString(params.account.avatar_url ?? null)
  const htmlUrl = toNullableString(params.account.html_url ?? null)
  const externalId = resolveAccountExternalId(params.account)

  const owner = await db
    .insertInto('owners')
    .values({
      login: params.account.login,
      name: accountName,
      type: accountType,
      avatarUrl,
      htmlUrl,
      externalId,
      installationId: params.installationId,
    })
    .onConflict((oc) =>
      oc.column('login').doUpdateSet({
        name: accountName,
        type: accountType,
        avatarUrl,
        htmlUrl,
        externalId,
        installationId: params.installationId,
      }),
    )
    .returning(['id', 'login'])
    .executeTakeFirst()

  if (!owner) {
    throw new Error('Failed to upsert owner record')
  }

  return owner
}

async function upsertRepositories(
  db: DbClient,
  params: {
    ownerId: string
    repositories: RepositoryPayload[]
    enabled: boolean
  },
): Promise<void> {
  if (params.repositories.length === 0) {
    return
  }

  await db.transaction().execute(async (trx) => {
    for (const repo of params.repositories) {
      const externalId =
        repo.id === undefined ? null : parseId(repo.id, 'repository.id')

      await trx
        .insertInto('repos')
        .values({
          ownerId: params.ownerId,
          externalId,
          name: repo.name,
          fullName: repo.full_name ?? null,
          description: repo.description ?? null,
          defaultBranch: repo.default_branch ?? null,
          htmlUrl: repo.html_url ?? null,
          private: repo.private ?? false,
          enabled: params.enabled,
        })
        .onConflict((oc) =>
          oc.columns(['ownerId', 'name']).doUpdateSet({
            externalId,
            fullName: repo.full_name ?? null,
            description: repo.description ?? null,
            defaultBranch: repo.default_branch ?? null,
            htmlUrl: repo.html_url ?? null,
            private: repo.private ?? false,
            enabled: params.enabled,
          }),
        )
        .execute()
    }
  })
}

async function disableRepositories(
  db: DbClient,
  params: {
    ownerId: string
    repositories: RepositoryPayload[]
  },
): Promise<void> {
  if (params.repositories.length === 0) {
    return
  }

  const externalIds: string[] = []
  const names = new Set<string>()

  for (const repo of params.repositories) {
    if (repo.id !== undefined) {
      try {
        externalIds.push(parseId(repo.id, 'repository.id').toString())
        continue
      } catch (error) {
        logger.warn('Failed to parse repository id when disabling repo', {
          error,
          repositoryId: repo.id,
          repositoryName: repo.name,
        })
      }
    }

    names.add(repo.name)
  }

  await db.transaction().execute(async (trx) => {
    if (externalIds.length > 0) {
      await trx
        .updateTable('repos')
        .set({ enabled: false })
        .where('ownerId', '=', params.ownerId)
        .where('externalId', 'in', externalIds)
        .execute()
    }

    const nameList = Array.from(names)

    if (nameList.length > 0) {
      await trx
        .updateTable('repos')
        .set({ enabled: false })
        .where('ownerId', '=', params.ownerId)
        .where('name', 'in', nameList)
        .execute()
    }
  })
}

async function handleInstallationEvent(
  rawPayload: unknown,
  deliveryId: string,
): Promise<void> {
  const parsed = installationEventSchema.parse(rawPayload)
  const { installation, repositories = [] } = parsed
  const action = parsed.action.toLowerCase()
  const installationId = parseId(installation.id, 'installation.id')

  const env = parseEnv()
  const db = setupDb(env.DATABASE_URL)

  try {
    const owner = await upsertOwnerRecord(db, {
      account: installation.account,
      installationId,
    })

    switch (action) {
      case 'deleted': {
        await db.transaction().execute(async (trx) => {
          await trx
            .updateTable('repos')
            .set({ enabled: false })
            .where('ownerId', '=', owner.id)
            .execute()

          await trx
            .updateTable('owners')
            .set({ installationId: null })
            .where('id', '=', owner.id)
            .execute()
        })

        logger.info('Processed installation deletion event', {
          deliveryId,
          installationId: String(installationId),
          ownerLogin: owner.login,
        })
        break
      }

      case 'suspend':
      case 'suspended': {
        await db
          .updateTable('repos')
          .set({ enabled: false })
          .where('ownerId', '=', owner.id)
          .execute()

        logger.info('Processed installation suspension event', {
          deliveryId,
          installationId: String(installationId),
          ownerLogin: owner.login,
        })
        break
      }

      case 'unsuspend':
      case 'unsuspended': {
        await db
          .updateTable('repos')
          .set({ enabled: true })
          .where('ownerId', '=', owner.id)
          .execute()

        logger.info('Processed installation unsuspension event', {
          deliveryId,
          installationId: String(installationId),
          ownerLogin: owner.login,
        })
        break
      }

      default: {
        if (repositories.length > 0) {
          await upsertRepositories(db, {
            ownerId: owner.id,
            repositories,
            enabled: false,
          })
        }

        logger.info('Processed installation event', {
          deliveryId,
          action,
          installationId: String(installationId),
          ownerLogin: owner.login,
          repositoryCount: repositories.length,
        })
      }
    }
  } finally {
    await db.destroy()
  }
}

async function handleInstallationRepositoriesEvent(
  rawPayload: unknown,
  deliveryId: string,
): Promise<void> {
  const parsed = installationRepositoriesEventSchema.parse(rawPayload)
  const installationId = parseId(parsed.installation.id, 'installation.id')
  const installationIdValue = installationId.toString()

  const env = parseEnv()
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

    if (repositoriesAdded.length > 0) {
      await upsertRepositories(db, {
        ownerId: owner.id,
        repositories: repositoriesAdded,
        enabled: true,
      })
    }

    if (repositoriesRemoved.length > 0) {
      await disableRepositories(db, {
        ownerId: owner.id,
        repositories: repositoriesRemoved,
      })
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

/**
 * Trigger.dev task that handles GitHub webhook events.
 *
 * This task receives webhook payloads from GitHub and processes them based on event type.
 *
 * @example
 * ```typescript
 * await handleGithubWebhookTask.trigger({
 *   eventType: 'push',
 *   deliveryId: 'delivery-123',
 *   payload: { ... }
 * })
 * ```
 *
 * @param payload.eventType - The GitHub event type (e.g., 'push', 'pull_request', 'installation')
 * @param payload.deliveryId - The unique delivery ID for this webhook event
 * @param payload.payload - The webhook payload data
 *
 * @returns Object containing:
 *   - success: boolean indicating if the operation succeeded
 *   - eventType: the event type that was processed
 *   - deliveryId: the delivery ID
 */
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

    // Handle different event types
    switch (payload.eventType) {
      // ============================================================================
      // CRITICAL EVENTS (High Priority)
      // ============================================================================

      case 'push': {
        logger.info('Processing push event', {
          deliveryId: payload.deliveryId,
        })
        // TODO: Trigger story discovery and test runs on new commits
        // - Extract commit SHA, branch name, and changed files from payload
        // - Find or create repository record in database
        // - Trigger find-stories-in-commit task for the commit
        // - Create a new run record with status 'running'
        // - Update GitHub status check to 'in_progress'
        break
      }

      case 'pull_request': {
        logger.info('Processing pull_request event', {
          deliveryId: payload.deliveryId,
        })
        // TODO: Handle pull request lifecycle events (opened, synchronize, closed, reopened)
        // - Extract PR number, head commit SHA, branch, and action from payload
        // - On 'opened' or 'synchronize': Create/update run for PR head commit
        // - On 'closed': Mark PR-related runs as complete
        // - Link runs to PR number in database
        // - Update GitHub status checks accordingly
        break
      }

      case 'installation': {
        logger.info('Processing installation event', {
          deliveryId: payload.deliveryId,
        })

        try {
          await handleInstallationEvent(payload.payload, payload.deliveryId)
        } catch (error) {
          logger.error('Failed to process installation event', {
            deliveryId: payload.deliveryId,
            error,
          })
          throw error
        }

        break
      }

      case 'installation_repositories': {
        logger.info('Processing installation_repositories event', {
          deliveryId: payload.deliveryId,
        })

        try {
          await handleInstallationRepositoriesEvent(
            payload.payload,
            payload.deliveryId,
          )
        } catch (error) {
          logger.error('Failed to process installation_repositories event', {
            deliveryId: payload.deliveryId,
            error,
          })
          throw error
        }

        break
      }

      case 'repository': {
        logger.info('Processing repository event', {
          deliveryId: payload.deliveryId,
        })
        // TODO: Handle repository lifecycle events (created, deleted, archived, unarchived, renamed, edited)
        // - Extract repository metadata from payload
        // - On 'created': Add new repository record
        // - On 'deleted': Mark as disabled or remove from database
        // - On 'renamed': Update repo name and full_name
        // - On 'archived'/'unarchived': Update repository status
        // - On 'edited': Update description, homepage, default_branch, etc.
        break
      }

      // ============================================================================
      // IMPORTANT EVENTS (Medium Priority)
      // ============================================================================

      case 'delete': {
        logger.info('Processing delete event', {
          deliveryId: payload.deliveryId,
        })
        // TODO: Handle branch/tag deletion
        // - Extract ref name and ref type (branch/tag)
        // - On branch deletion: Clean up branch-specific stories and runs
        // - Archive or remove branch-related data
        break
      }

      // ============================================================================
      // NICE-TO-HAVE EVENTS (Lower Priority)
      // ============================================================================

      case 'installation_targets': {
        logger.info('Processing installation_targets event', {
          deliveryId: payload.deliveryId,
        })
        // TODO: Handle installation target changes (added, removed)
        // - Extract installation_id and target account information
        // - Update owner associations when installation targets change
        break
      }

      case 'meta': {
        logger.info('Processing meta event', {
          deliveryId: payload.deliveryId,
        })
        // TODO: Handle repository deletion hook
        // - This event is sent when a repository is deleted
        // - Clean up all repository data (stories, runs, etc.)
        // - Remove repository record from database
        break
      }

      case 'public': {
        logger.info('Processing public event', {
          deliveryId: payload.deliveryId,
        })
        // TODO: Handle repository visibility change to public
        // - Update repository private flag to false
        break
      }

      case 'private': {
        logger.info('Processing private event', {
          deliveryId: payload.deliveryId,
        })
        // TODO: Handle repository visibility change to private
        // - Update repository private flag to true
        break
      }

      case 'repository_vulnerability_alert': {
        logger.info('Processing repository_vulnerability_alert event', {
          deliveryId: payload.deliveryId,
        })
        // TODO: Track security vulnerability alerts (create, dismiss, resolve)
        // - Extract vulnerability alert information
        // - Log security alerts for context (may affect test runs)
        break
      }

      case 'release': {
        logger.info('Processing release event', {
          deliveryId: payload.deliveryId,
        })
        // TODO: Handle release lifecycle (published, unpublished, created, edited, deleted, prereleased, released)
        // - Extract release tag, commit SHA, and release information
        // - Optionally link runs to releases for tracking
        break
      }

      default: {
        logger.info('Unhandled webhook event type', {
          eventType: payload.eventType,
          deliveryId: payload.deliveryId,
        })
      }
    }

    // Satisfy require-await rule (async operations will be added when implementing handlers)
    await Promise.resolve()

    return {
      success: true,
      eventType: payload.eventType,
      deliveryId: payload.deliveryId,
    }
  },
})
