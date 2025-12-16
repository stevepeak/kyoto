import { and, eq, schema } from '@app/db'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { findOwnerForUser } from '../../helpers/memberships'
import { protectedProcedure } from '../../trpc'

type RepoListItem = {
  id: string
  name: string
  defaultBranch: string | null
  enabled: boolean
  isPrivate: boolean
}

export const listByOrg = protectedProcedure
  .input(z.object({ orgName: z.string() }))
  .query(async ({ ctx, input }) => {
    const userId = ctx.user?.id

    if (!userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }

    const owner = await findOwnerForUser(ctx.db, {
      orgName: input.orgName,
      userId,
    })

    if (!owner) {
      return {
        owner: null,
        repos: [] as RepoListItem[],
      }
    }

    const repos = await ctx.db
      .select({
        id: schema.repos.id,
        name: schema.repos.name,
        defaultBranch: schema.repos.defaultBranch,
        enabled: schema.repos.enabled,
        isPrivate: schema.repos.private,
      })
      .from(schema.repos)
      .innerJoin(
        schema.repoMemberships,
        eq(schema.repoMemberships.repoId, schema.repos.id),
      )
      .where(
        and(
          eq(schema.repos.ownerId, owner.id),
          eq(schema.repoMemberships.userId, userId),
        ),
      )
      .orderBy(schema.repos.name)

    return {
      owner: {
        id: owner.id,
        slug: owner.login,
        name: owner.name ?? owner.login,
      },
      repos: repos.map((repo) => ({
        id: repo.id,
        name: repo.name,
        defaultBranch: repo.defaultBranch,
        enabled: repo.enabled,
        isPrivate: repo.isPrivate,
      })),
    }
  })
