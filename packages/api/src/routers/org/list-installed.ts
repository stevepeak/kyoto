import { and, asc, count, eq, inArray, isNotNull, schema } from '@app/db'
import { TRPCError } from '@trpc/server'

import { protectedProcedure } from '../../trpc'

export const listInstalled = protectedProcedure.query(async ({ ctx }) => {
  const userId = ctx.user?.id

  if (!userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  const owners = await ctx.db
    .select({
      ownerId: schema.owners.id,
      slug: schema.owners.login,
      accountName: schema.owners.name,
    })
    .from(schema.owners)
    .innerJoin(
      schema.ownerMemberships,
      eq(schema.ownerMemberships.ownerId, schema.owners.id),
    )
    .where(
      and(
        isNotNull(schema.owners.installationId),
        eq(schema.ownerMemberships.userId, userId),
      ),
    )
    .orderBy(asc(schema.owners.login))

  const ownerIds = owners.map((owner) => owner.ownerId)

  const repoCounts =
    ownerIds.length === 0
      ? []
      : await ctx.db
          .select({
            ownerId: schema.repos.ownerId,
            count: count(),
          })
          .from(schema.repos)
          .innerJoin(
            schema.repoMemberships,
            eq(schema.repoMemberships.repoId, schema.repos.id),
          )
          .where(
            and(
              inArray(schema.repos.ownerId, ownerIds),
              eq(schema.repos.enabled, true),
              eq(schema.repoMemberships.userId, userId),
            ),
          )
          .groupBy(schema.repos.ownerId)

  const repoCountByOwner = new Map(
    repoCounts.map((entry) => [entry.ownerId, entry.count]),
  )

  return {
    orgs: owners.map((owner) => ({
      slug: owner.slug,
      name: owner.accountName ?? owner.slug,
      accountName: owner.accountName ?? null,
      repoCount: repoCountByOwner.get(owner.ownerId) ?? 0,
    })),
  }
})
