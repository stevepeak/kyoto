import { and, asc, count, desc, eq, inArray, ne, schema } from '@app/db'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { findOwnerForUser } from '../../helpers/memberships'
import { protectedProcedure } from '../../trpc'

type RepoListItemStatus = 'pass' | 'fail' | 'skipped' | 'running' | 'error'

type RepoListItem = {
  id: string
  name: string
  defaultBranch: string | null
  enabled: boolean
  isPrivate: boolean
  storyCount: number
  lastRunStatus: RepoListItemStatus | null
  lastRunAt: Date | null
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

    const repoIds = repos.map((repo) => repo.id)

    const storyCounts =
      repoIds.length === 0
        ? []
        : await ctx.db
            .select({
              repoId: schema.stories.repoId,
              count: count(),
            })
            .from(schema.stories)
            .where(
              and(
                inArray(schema.stories.repoId, repoIds),
                ne(schema.stories.state, 'archived'),
              ),
            )
            .groupBy(schema.stories.repoId)

    let latestRunStatusByRepo = new Map<
      string,
      { status: RepoListItemStatus; createdAt: Date }
    >()

    if (repoIds.length > 0) {
      const runRows = await ctx.db
        .select({
          repoId: schema.runs.repoId,
          status: schema.runs.status,
          createdAt: schema.runs.createdAt,
        })
        .from(schema.runs)
        .where(inArray(schema.runs.repoId, repoIds))
        .orderBy(
          asc(schema.runs.repoId),
          desc(schema.runs.createdAt),
          desc(schema.runs.id),
        )

      latestRunStatusByRepo = runRows.reduce(
        (
          acc,
          row,
        ): Map<string, { status: RepoListItemStatus; createdAt: Date }> => {
          if (
            !acc.has(row.repoId) &&
            row.createdAt !== null &&
            row.createdAt instanceof Date &&
            (row.status === 'pass' ||
              row.status === 'fail' ||
              row.status === 'skipped' ||
              row.status === 'running' ||
              row.status === 'error')
          ) {
            acc.set(row.repoId, {
              status: row.status as RepoListItemStatus,
              createdAt: row.createdAt,
            })
          }
          return acc
        },
        new Map<string, { status: RepoListItemStatus; createdAt: Date }>(),
      )
    }

    const storyCountByRepo = new Map(
      storyCounts.map((entry) => [entry.repoId, Number(entry.count)]),
    )

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
        storyCount: storyCountByRepo.get(repo.id) ?? 0,
        lastRunStatus: latestRunStatusByRepo.get(repo.id)?.status ?? null,
        lastRunAt: latestRunStatusByRepo.get(repo.id)?.createdAt ?? null,
      })),
    }
  })
