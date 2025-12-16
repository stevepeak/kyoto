import { and, type DB, eq, schema } from '@app/db'
import { TRPCError } from '@trpc/server'

type Owner = typeof schema.owners.$inferSelect
type Repo = typeof schema.repos.$inferSelect

interface WithUserId {
  userId: string
}

export async function findOwnerForUser(
  db: DB,
  params: WithUserId & { orgName: string },
): Promise<Owner | null> {
  const results = await db
    .select({
      id: schema.owners.id,
      createdAt: schema.owners.createdAt,
      updatedAt: schema.owners.updatedAt,
      externalId: schema.owners.externalId,
      login: schema.owners.login,
      name: schema.owners.name,
      type: schema.owners.type,
      avatarUrl: schema.owners.avatarUrl,
      htmlUrl: schema.owners.htmlUrl,
      installationId: schema.owners.installationId,
    })
    .from(schema.owners)
    .innerJoin(
      schema.ownerMemberships,
      eq(schema.ownerMemberships.ownerId, schema.owners.id),
    )
    .where(
      and(
        eq(schema.owners.login, params.orgName),
        eq(schema.ownerMemberships.userId, params.userId),
      ),
    )
    .limit(1)

  return results[0] ?? null
}

export async function findRepoForUser(
  db: DB,
  params: WithUserId & { orgName: string; repoName: string },
): Promise<Repo | null> {
  const results = await db
    .select({
      id: schema.repos.id,
      ownerId: schema.repos.ownerId,
      createdAt: schema.repos.createdAt,
      updatedAt: schema.repos.updatedAt,
      externalId: schema.repos.externalId,
      name: schema.repos.name,
      fullName: schema.repos.fullName,
      private: schema.repos.private,
      description: schema.repos.description,
      defaultBranch: schema.repos.defaultBranch,
      htmlUrl: schema.repos.htmlUrl,
      enabled: schema.repos.enabled,
    })
    .from(schema.repos)
    .innerJoin(schema.owners, eq(schema.owners.id, schema.repos.ownerId))
    .innerJoin(
      schema.repoMemberships,
      eq(schema.repoMemberships.repoId, schema.repos.id),
    )
    .innerJoin(
      schema.ownerMemberships,
      eq(schema.ownerMemberships.ownerId, schema.repos.ownerId),
    )
    .where(
      and(
        eq(schema.repos.name, params.repoName),
        eq(schema.owners.login, params.orgName),
        eq(schema.repoMemberships.userId, params.userId),
        eq(schema.ownerMemberships.userId, params.userId),
      ),
    )
    .limit(1)

  return results[0] ?? null
}

export async function requireRepoForUser(
  db: DB,
  params: WithUserId & { orgName: string; repoName: string },
): Promise<Repo> {
  const repo = await findRepoForUser(db, params)

  if (!repo) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Repository not accessible',
    })
  }

  return repo
}
