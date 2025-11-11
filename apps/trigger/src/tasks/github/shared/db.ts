import type { setupDb } from '@app/db'
import { logger } from '@trigger.dev/sdk'

import type { AccountPayload, RepositoryPayload } from './schemas'
import { parseId, resolveAccountExternalId, toNullableString } from './utils'

type DbClient = ReturnType<typeof setupDb>

function normalizeGithubAccountId(
  accountId: string | number | bigint | null | undefined,
): string | null {
  if (accountId === null || accountId === undefined) {
    return null
  }

  const candidate = String(accountId).trim()

  if (candidate.length === 0) {
    return null
  }

  return candidate
}

export async function findUserIdsByGithubAccountId(
  db: DbClient,
  accountId: string | number | bigint | null | undefined,
): Promise<string[]> {
  const normalizedId = normalizeGithubAccountId(accountId)

  if (!normalizedId) {
    return []
  }

  const candidateIds = new Set<string>([
    normalizedId,
    `github:${normalizedId}`,
    `github|${normalizedId}`,
  ])

  const accounts = await db
    .selectFrom('accounts')
    .select('userId')
    .where('providerId', '=', 'github')
    .where('accountId', 'in', Array.from(candidateIds))
    .execute()

  return Array.from(new Set(accounts.map((account) => account.userId)))
}

export async function ensureOwnerMemberships(
  db: DbClient,
  params: { ownerId: string; userIds: readonly string[]; role?: string },
): Promise<void> {
  const uniqueUserIds = Array.from(new Set(params.userIds))

  if (uniqueUserIds.length === 0) {
    return
  }

  const role = params.role ?? 'member'

  await db
    .insertInto('ownerMemberships')
    .values(
      uniqueUserIds.map((userId) => ({
        ownerId: params.ownerId,
        userId,
        role,
      })),
    )
    .onConflict((oc) =>
      oc.columns(['ownerId', 'userId']).doUpdateSet({
        role,
      }),
    )
    .execute()
}

export async function ensureRepoMemberships(
  db: DbClient,
  params: {
    repoIds: readonly string[]
    userIds: readonly string[]
    role?: string
  },
): Promise<void> {
  const uniqueRepoIds = Array.from(new Set(params.repoIds))
  const uniqueUserIds = Array.from(new Set(params.userIds))

  if (uniqueRepoIds.length === 0 || uniqueUserIds.length === 0) {
    return
  }

  const role = params.role ?? 'member'

  await db
    .insertInto('repoMemberships')
    .values(
      uniqueRepoIds.flatMap((repoId) =>
        uniqueUserIds.map((userId) => ({
          repoId,
          userId,
          role,
        })),
      ),
    )
    .onConflict((oc) =>
      oc.columns(['repoId', 'userId']).doUpdateSet({
        role,
      }),
    )
    .execute()
}

export async function removeRepoMemberships(
  db: DbClient,
  params: { repoIds: readonly string[]; userIds?: readonly string[] },
): Promise<void> {
  const uniqueRepoIds = Array.from(new Set(params.repoIds))

  if (uniqueRepoIds.length === 0) {
    return
  }

  let query = db
    .deleteFrom('repoMemberships')
    .where('repoId', 'in', uniqueRepoIds)

  if (params.userIds && params.userIds.length > 0) {
    query = query.where('userId', 'in', Array.from(new Set(params.userIds)))
  }

  await query.execute()
}

export async function pruneRepoMemberships(
  db: DbClient,
  params: { repoIds: readonly string[]; keepUserIds: readonly string[] },
): Promise<void> {
  const uniqueRepoIds = Array.from(new Set(params.repoIds))
  const keepUserIds = Array.from(new Set(params.keepUserIds))

  if (uniqueRepoIds.length === 0) {
    return
  }

  const baseQuery = db
    .deleteFrom('repoMemberships')
    .where('repoId', 'in', uniqueRepoIds)

  if (keepUserIds.length === 0) {
    await baseQuery.execute()
    return
  }

  await baseQuery.where('userId', 'not in', keepUserIds).execute()
}

export async function removeAllMembershipsForOwner(
  db: DbClient,
  ownerId: string,
): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom('repoMemberships')
      .where('repoId', 'in', (qb) =>
        qb.selectFrom('repos').select('id').where('ownerId', '=', ownerId),
      )
      .execute()

    await trx
      .deleteFrom('ownerMemberships')
      .where('ownerId', '=', ownerId)
      .execute()
  })
}

export async function pruneOwnerMemberships(
  db: DbClient,
  params: { ownerId: string; keepUserIds: readonly string[] },
): Promise<void> {
  const keepUserIds = Array.from(new Set(params.keepUserIds))

  const baseQuery = db
    .deleteFrom('ownerMemberships')
    .where('ownerId', '=', params.ownerId)

  if (keepUserIds.length === 0) {
    await baseQuery.execute()
    return
  }

  await baseQuery.where('userId', 'not in', keepUserIds).execute()
}

export async function listOwnerMemberUserIds(
  db: DbClient,
  ownerId: string,
): Promise<string[]> {
  const rows = await db
    .selectFrom('ownerMemberships')
    .select('userId')
    .where('ownerId', '=', ownerId)
    .execute()

  return rows.map((row) => row.userId)
}

export async function findRepoIdsByNames(
  db: DbClient,
  params: { ownerId: string; repoNames: readonly string[] },
): Promise<string[]> {
  const uniqueNames = Array.from(
    new Set(
      params.repoNames
        .map((name) => name.trim())
        .filter((name) => name.length > 0),
    ),
  )

  if (uniqueNames.length === 0) {
    return []
  }

  const rows = await db
    .selectFrom('repos')
    .select('id')
    .where('ownerId', '=', params.ownerId)
    .where('name', 'in', uniqueNames)
    .execute()

  return rows.map((row) => row.id)
}

export async function findRepoIdsByOwnerId(
  db: DbClient,
  ownerId: string,
): Promise<string[]> {
  const rows = await db
    .selectFrom('repos')
    .select('id')
    .where('ownerId', '=', ownerId)
    .execute()

  return rows.map((row) => row.id)
}

export interface RepoLookupResult {
  repoId: string
  ownerId: string
  repoName: string
  ownerLogin: string
  defaultBranch: string | null
  enabled: boolean
}

export async function findRepoByOwnerAndName(
  db: DbClient,
  params: { ownerLogin: string; repoName: string },
): Promise<RepoLookupResult | null> {
  const repoRecord = await db
    .selectFrom('repos')
    .innerJoin('owners', 'repos.ownerId', 'owners.id')
    .select([
      'repos.id as repoId',
      'repos.ownerId as ownerId',
      'repos.name as repoName',
      'repos.defaultBranch as defaultBranch',
      'repos.enabled as enabled',
      'owners.login as ownerLogin',
    ])
    .where('owners.login', '=', params.ownerLogin)
    .where('repos.name', '=', params.repoName)
    .executeTakeFirst()

  return repoRecord ?? null
}

export async function findActiveRunForPr(
  db: DbClient,
  params: { repoId: string; prNumber: string },
): Promise<{ id: string } | null> {
  const run = await db
    .selectFrom('runs')
    .select(['id'])
    .where('repoId', '=', params.repoId)
    .where('prNumber', '=', params.prNumber)
    .where('status', '=', 'running')
    .executeTakeFirst()

  return run ?? null
}

export async function upsertOwnerRecord(
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

export async function upsertRepositories(
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

export async function disableRepositories(
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

export async function setRepositoriesEnabledForOwner(
  db: DbClient,
  params: { ownerId: string; enabled: boolean },
): Promise<void> {
  await db
    .updateTable('repos')
    .set({ enabled: params.enabled })
    .where('ownerId', '=', params.ownerId)
    .execute()
}

export async function disableAllReposAndClearInstallation(
  db: DbClient,
  ownerId: string,
): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable('repos')
      .set({ enabled: false })
      .where('ownerId', '=', ownerId)
      .execute()

    await trx
      .updateTable('owners')
      .set({ installationId: null })
      .where('id', '=', ownerId)
      .execute()
  })
}
