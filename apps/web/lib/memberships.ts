import { and, eq, type Owner, type Repo, schema } from '@app/db'

import { db } from '@/lib/db'

interface GetUserOrganizationsArgs {
  userId: string
}

export async function getUserOrganizations(
  args: GetUserOrganizationsArgs,
): Promise<Owner[]> {
  const organizations = await db
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
    .where(eq(schema.ownerMemberships.userId, args.userId))

  return organizations
}

interface CheckOwnerMembershipArgs {
  userId: string
  orgSlug: string
}

export async function checkOwnerMembership(
  args: CheckOwnerMembershipArgs,
): Promise<Owner | null> {
  const organizations = await db
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
        eq(schema.ownerMemberships.userId, args.userId),
        eq(schema.owners.login, args.orgSlug),
      ),
    )
    .limit(1)

  return organizations[0] ?? null
}

interface GetOrgRepositoriesArgs {
  userId: string
  orgSlug: string
}

export async function getOrgRepositories(
  args: GetOrgRepositoriesArgs,
): Promise<Repo[]> {
  const repositories = await db
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
    .where(
      and(
        eq(schema.owners.login, args.orgSlug),
        eq(schema.repoMemberships.userId, args.userId),
      ),
    )

  return repositories
}

interface CheckRepoMembershipArgs {
  userId: string
  orgSlug: string
  repoSlug: string
}

export async function checkRepoMembership(
  args: CheckRepoMembershipArgs,
): Promise<Repo | null> {
  const repositories = await db
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
    .where(
      and(
        eq(schema.owners.login, args.orgSlug),
        eq(schema.repos.name, args.repoSlug),
        eq(schema.repoMemberships.userId, args.userId),
      ),
    )
    .limit(1)

  return repositories[0] ?? null
}
