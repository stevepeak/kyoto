import { TRPCError } from '@trpc/server'
import { tasks } from '@trigger.dev/sdk'
import { z } from 'zod'
import { eq, and, ne, inArray, count, sql, asc } from 'drizzle-orm'

import {
  findOwnerForUser,
  findRepoForUser,
  requireRepoForUser,
} from '../helpers/memberships'
import { protectedProcedure, router } from '../trpc'
import { repos, repoMemberships, stories, owners } from '@app/db/schema'

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

export const repoRouter = router({
  listByOrg: protectedProcedure
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

      const reposList = await ctx.db
        .select({
          id: repos.id,
          name: repos.name,
          defaultBranch: repos.defaultBranch,
          enabled: repos.enabled,
          private: repos.private,
        })
        .from(repos)
        .innerJoin(repoMemberships, eq(repoMemberships.repoId, repos.id))
        .where(
          and(eq(repos.ownerId, owner.id), eq(repoMemberships.userId, userId)),
        )
        .orderBy(asc(repos.name))

      const repoIds = reposList.map((repo) => repo.id)

      const storyCounts =
        repoIds.length === 0
          ? []
          : await ctx.db
              .select({
                repoId: stories.repoId,
                count: count(stories.id),
              })
              .from(stories)
              .where(
                and(
                  inArray(stories.repoId, repoIds),
                  ne(stories.state, 'archived'),
                ),
              )
              .groupBy(stories.repoId)

      // For latest runs, use a window function approach with raw SQL
      // Using inArray would be simpler but DISTINCT ON requires raw SQL
      const latestRuns =
        repoIds.length === 0
          ? { rows: [] }
          : await ctx.db.execute(
              sql`
                SELECT DISTINCT ON (runs.repo_id)
                  runs.repo_id as "repoId",
                  runs.status,
                  runs.created_at as "createdAt"
                FROM runs
                WHERE runs.repo_id = ANY(${repoIds}::uuid[])
                ORDER BY runs.repo_id, runs.created_at DESC
              `,
            )

      const storyCountByRepo = new Map(
        storyCounts.map((entry) => [entry.repoId, Number(entry.count)]),
      )

      const latestRunStatusByRepo = new Map<
        string,
        { status: RepoListItemStatus; createdAt: Date }
      >(
        (
          latestRuns.rows as Array<{
            repoId: string
            status: string
            createdAt: Date
          }>
        )
          .filter(
            (
              entry,
            ): entry is {
              repoId: string
              status: RepoListItemStatus
              createdAt: Date
            } =>
              entry.createdAt !== null &&
              entry.createdAt instanceof Date &&
              (entry.status === 'pass' ||
                entry.status === 'fail' ||
                entry.status === 'skipped' ||
                entry.status === 'running' ||
                entry.status === 'error'),
          )
          .map((entry) => [
            entry.repoId,
            {
              status: entry.status,
              createdAt: entry.createdAt,
            },
          ]),
      )

      return {
        owner: {
          id: owner.id,
          slug: owner.login,
          name: owner.name ?? owner.login,
        },
        repos: reposList.map((repo) => ({
          id: repo.id,
          name: repo.name,
          defaultBranch: repo.defaultBranch,
          enabled: repo.enabled,
          isPrivate: repo.private,
          storyCount: storyCountByRepo.get(repo.id) ?? 0,
          lastRunStatus: latestRunStatusByRepo.get(repo.id)?.status ?? null,
          lastRunAt: latestRunStatusByRepo.get(repo.id)?.createdAt ?? null,
        })),
      }
    }),

  getBySlug: protectedProcedure
    .input(z.object({ orgName: z.string(), repoName: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id

      if (!userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      const repo = await findRepoForUser(ctx.db, {
        orgName: input.orgName,
        repoName: input.repoName,
        userId,
      })

      if (!repo) {
        return { repo: null }
      }

      return {
        repo: {
          id: repo.id,
          name: repo.name,
          defaultBranch: repo.defaultBranch,
          enabled: repo.enabled,
        },
      }
    }),

  enableRepo: protectedProcedure
    .input(z.object({ orgName: z.string(), repoName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id

      if (!userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      const repo = await requireRepoForUser(ctx.db, {
        orgName: input.orgName,
        repoName: input.repoName,
        userId,
      })

      if (repo.enabled) {
        return { enabled: true, repoId: repo.id }
      }

      await ctx.db
        .update(repos)
        .set({ enabled: true })
        .where(eq(repos.id, repo.id))

      // Trigger story discovery for newly enabled repos that have no stories
      const storyCountResult = await ctx.db
        .select({ count: count() })
        .from(stories)
        .where(eq(stories.repoId, repo.id))

      const hasStories = Number(storyCountResult[0]?.count ?? 0) > 0

      if (!hasStories) {
        const ownerResult = await ctx.db
          .select({ login: owners.login })
          .from(owners)
          .where(eq(owners.id, repo.ownerId))
          .limit(1)

        const owner = ownerResult[0]

        if (owner) {
          const repoSlug = `${owner.login}/${repo.name}`

          await tasks.trigger(
            'discover-stories',
            {
              repoSlug,
              storyCount: 3,
              save: true,
            },
            {
              tags: [`owner_${owner.login}`, `repo_${repo.name}`],
              priority: 10,
            },
          )
        }
      }

      return { enabled: true, repoId: repo.id }
    }),

  disableRepo: protectedProcedure
    .input(z.object({ orgName: z.string(), repoName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id

      if (!userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      const repo = await requireRepoForUser(ctx.db, {
        orgName: input.orgName,
        repoName: input.repoName,
        userId,
      })

      if (!repo.enabled) {
        return { enabled: false, repoId: repo.id }
      }

      await ctx.db
        .update(repos)
        .set({ enabled: false })
        .where(eq(repos.id, repo.id))

      return { enabled: false, repoId: repo.id }
    }),
})
