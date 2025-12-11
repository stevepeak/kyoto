import { and, type createDb, eq, inArray, notInArray, schema } from '@app/db'
import { logger } from '@trigger.dev/sdk'

import { type AccountPayload, type RepositoryPayload } from './schemas'
import { parseId, resolveAccountExternalId, toNullableString } from './utils'

type DbClient = ReturnType<typeof createDb>

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
    .select({ userId: schema.account.userId })
    .from(schema.account)
    .where(
      and(
        eq(schema.account.providerId, 'github'),
        inArray(schema.account.accountId, Array.from(candidateIds)),
      ),
    )

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
    .insert(schema.ownerMemberships)
    .values(
      uniqueUserIds.map((userId) => ({
        ownerId: params.ownerId,
        userId,
        role,
      })),
    )
    .onConflictDoUpdate({
      target: [schema.ownerMemberships.ownerId, schema.ownerMemberships.userId],
      set: {
        role,
      },
    })
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
    .insert(schema.repoMemberships)
    .values(
      uniqueRepoIds.flatMap((repoId) =>
        uniqueUserIds.map((userId) => ({
          repoId,
          userId,
          role,
        })),
      ),
    )
    .onConflictDoUpdate({
      target: [schema.repoMemberships.repoId, schema.repoMemberships.userId],
      set: {
        role,
      },
    })
}

export async function removeRepoMemberships(
  db: DbClient,
  params: { repoIds: readonly string[]; userIds?: readonly string[] },
): Promise<void> {
  const uniqueRepoIds = Array.from(new Set(params.repoIds))

  if (uniqueRepoIds.length === 0) {
    return
  }

  const conditions = [inArray(schema.repoMemberships.repoId, uniqueRepoIds)]

  if (params.userIds && params.userIds.length > 0) {
    conditions.push(
      inArray(
        schema.repoMemberships.userId,
        Array.from(new Set(params.userIds)),
      ),
    )
  }

  await db.delete(schema.repoMemberships).where(and(...conditions))
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

  const conditions = [inArray(schema.repoMemberships.repoId, uniqueRepoIds)]

  if (keepUserIds.length > 0) {
    conditions.push(notInArray(schema.repoMemberships.userId, keepUserIds))
  }

  await db.delete(schema.repoMemberships).where(and(...conditions))
}

export async function removeAllMembershipsForOwner(
  db: DbClient,
  ownerId: string,
): Promise<void> {
  await db.transaction(async (trx) => {
    const repoIds = await trx
      .select({ id: schema.repos.id })
      .from(schema.repos)
      .where(eq(schema.repos.ownerId, ownerId))

    if (repoIds.length > 0) {
      await trx.delete(schema.repoMemberships).where(
        inArray(
          schema.repoMemberships.repoId,
          repoIds.map((r) => r.id),
        ),
      )
    }

    await trx
      .delete(schema.ownerMemberships)
      .where(eq(schema.ownerMemberships.ownerId, ownerId))
  })
}

export async function pruneOwnerMemberships(
  db: DbClient,
  params: { ownerId: string; keepUserIds: readonly string[] },
): Promise<void> {
  const keepUserIds = Array.from(new Set(params.keepUserIds))

  const conditions = [eq(schema.ownerMemberships.ownerId, params.ownerId)]

  if (keepUserIds.length > 0) {
    conditions.push(notInArray(schema.ownerMemberships.userId, keepUserIds))
  }

  await db.delete(schema.ownerMemberships).where(and(...conditions))
}

export async function listOwnerMemberUserIds(
  db: DbClient,
  ownerId: string,
): Promise<string[]> {
  const rows = await db
    .select({ userId: schema.ownerMemberships.userId })
    .from(schema.ownerMemberships)
    .where(eq(schema.ownerMemberships.ownerId, ownerId))

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
    .select({ id: schema.repos.id })
    .from(schema.repos)
    .where(
      and(
        eq(schema.repos.ownerId, params.ownerId),
        inArray(schema.repos.name, uniqueNames),
      ),
    )

  return rows.map((row) => row.id)
}

export async function findRepoIdsByOwnerId(
  db: DbClient,
  ownerId: string,
): Promise<string[]> {
  const rows = await db
    .select({ id: schema.repos.id })
    .from(schema.repos)
    .where(eq(schema.repos.ownerId, ownerId))

  return rows.map((row) => row.id)
}

interface RepoLookupResult {
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
    .select({
      repoId: schema.repos.id,
      ownerId: schema.repos.ownerId,
      repoName: schema.repos.name,
      defaultBranch: schema.repos.defaultBranch,
      enabled: schema.repos.enabled,
      ownerLogin: schema.owners.login,
    })
    .from(schema.repos)
    .innerJoin(schema.owners, eq(schema.repos.ownerId, schema.owners.id))
    .where(
      and(
        eq(schema.owners.login, params.ownerLogin),
        eq(schema.repos.name, params.repoName),
      ),
    )
    .limit(1)

  const result = repoRecord[0]
  return result ?? null
}

export async function findActiveRunForPr(
  db: DbClient,
  params: { repoId: string; prNumber: string },
): Promise<{ id: string } | null> {
  const runs = await db
    .select({ id: schema.runs.id })
    .from(schema.runs)
    .where(
      and(
        eq(schema.runs.repoId, params.repoId),
        eq(schema.runs.prNumber, params.prNumber),
        eq(schema.runs.status, 'running'),
      ),
    )
    .limit(1)

  return runs[0] ?? null
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

  const owners = await db
    .insert(schema.owners)
    .values({
      login: params.account.login,
      name: accountName,
      type: accountType,
      avatarUrl,
      htmlUrl,
      externalId: externalId ? Number(externalId) : null,
      installationId: params.installationId
        ? Number(params.installationId)
        : null,
    })
    .onConflictDoUpdate({
      target: schema.owners.login,
      set: {
        name: accountName,
        type: accountType,
        avatarUrl,
        htmlUrl,
        externalId: externalId ? Number(externalId) : null,
        installationId: params.installationId
          ? Number(params.installationId)
          : null,
      },
    })
    .returning({ id: schema.owners.id, login: schema.owners.login })

  const owner = owners[0]
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

  await db.transaction(async (trx) => {
    for (const repo of params.repositories) {
      const externalId =
        repo.id === undefined ? null : parseId(repo.id, 'repository.id')

      await trx
        .insert(schema.repos)
        .values({
          ownerId: params.ownerId,
          externalId: externalId ? Number(externalId) : null,
          name: repo.name,
          fullName: repo.full_name ?? null,
          description: repo.description ?? null,
          defaultBranch: repo.default_branch ?? null,
          htmlUrl: repo.html_url ?? null,
          private: repo.private ?? false,
          enabled: params.enabled,
        })
        .onConflictDoUpdate({
          target: [schema.repos.ownerId, schema.repos.name],
          set: {
            externalId: externalId ? Number(externalId) : null,
            fullName: repo.full_name ?? null,
            description: repo.description ?? null,
            defaultBranch: repo.default_branch ?? null,
            htmlUrl: repo.html_url ?? null,
            private: repo.private ?? false,
            enabled: params.enabled,
          },
        })
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
        externalIds.push(Number(parseId(repo.id, 'repository.id')).toString())
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

  await db.transaction(async (trx) => {
    if (externalIds.length > 0) {
      await trx
        .update(schema.repos)
        .set({ enabled: false })
        .where(
          and(
            eq(schema.repos.ownerId, params.ownerId),
            inArray(
              schema.repos.externalId,
              externalIds.map((id) => Number(id)),
            ),
          ),
        )
    }

    const nameList = Array.from(names)

    if (nameList.length > 0) {
      await trx
        .update(schema.repos)
        .set({ enabled: false })
        .where(
          and(
            eq(schema.repos.ownerId, params.ownerId),
            inArray(schema.repos.name, nameList),
          ),
        )
    }
  })
}

export async function setRepositoriesEnabledForOwner(
  db: DbClient,
  params: { ownerId: string; enabled: boolean },
): Promise<void> {
  await db
    .update(schema.repos)
    .set({ enabled: params.enabled })
    .where(eq(schema.repos.ownerId, params.ownerId))
}

export async function disableAllReposAndClearInstallation(
  db: DbClient,
  ownerId: string,
): Promise<void> {
  await db.transaction(async (trx) => {
    await trx
      .update(schema.repos)
      .set({ enabled: false })
      .where(eq(schema.repos.ownerId, ownerId))

    await trx
      .update(schema.owners)
      .set({ installationId: null })
      .where(eq(schema.owners.id, ownerId))
  })
}
