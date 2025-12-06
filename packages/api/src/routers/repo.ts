import { TRPCError } from '@trpc/server'
import { tasks } from '@trigger.dev/sdk'
import { z } from 'zod'
import { capturePostHogEvent, POSTHOG_EVENTS } from '@app/posthog'

import {
  findOwnerForUser,
  findRepoForUser,
  requireRepoForUser,
} from '../helpers/memberships.js'
import { protectedProcedure, router } from '../trpc.js'

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

      const repos = await ctx.db
        .selectFrom('repos')
        .innerJoin('repoMemberships', 'repoMemberships.repoId', 'repos.id')
        .select([
          'repos.id as id',
          'repos.name as name',
          'repos.defaultBranch as defaultBranch',
          'repos.enabled as enabled',
          'repos.private as private',
        ])
        .where('repos.ownerId', '=', owner.id)
        .where('repoMemberships.userId', '=', userId)
        .orderBy('repos.name')
        .execute()

      const repoIds = repos.map((repo) => repo.id)

      const storyCounts =
        repoIds.length === 0
          ? []
          : await ctx.db
              .selectFrom('stories')
              .select(['repoId'])
              .select((eb) => eb.fn.count('stories.id').as('count'))
              .where('repoId', 'in', repoIds)
              .where('state', '!=', 'archived')
              .groupBy('repoId')
              .execute()

      const latestRuns =
        repoIds.length === 0
          ? []
          : await ctx.db
              .with('latest_run_times', (db) =>
                db
                  .selectFrom('runs')
                  .select(['repoId'])
                  .select((eb) => eb.fn.max('createdAt').as('maxCreatedAt'))
                  .where('repoId', 'in', repoIds)
                  .groupBy('repoId'),
              )
              .selectFrom('runs')
              .innerJoin('latest_run_times', (join) =>
                join
                  .onRef('runs.repoId', '=', 'latest_run_times.repoId')
                  .onRef(
                    'runs.createdAt',
                    '=',
                    'latest_run_times.maxCreatedAt',
                  ),
              )
              .select([
                'runs.repoId as repoId',
                'runs.status as status',
                'runs.createdAt as createdAt',
              ])
              .execute()

      const storyCountByRepo = new Map(
        storyCounts.map((entry) => [entry.repoId, Number(entry.count)]),
      )

      const latestRunStatusByRepo = new Map<
        string,
        { status: RepoListItemStatus; createdAt: Date }
      >(
        latestRuns
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
        repos: repos.map((repo) => ({
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
        .updateTable('repos')
        .set({ enabled: true })
        .where('id', '=', repo.id)
        .execute()

      // Track repo added event
      capturePostHogEvent(
        POSTHOG_EVENTS.REPO_ADDED,
        {
          repo_id: repo.id,
          repo_name: repo.name,
          repo_full_name: repo.fullName ?? null,
          owner_id: repo.ownerId,
          org_name: input.orgName,
        },
        userId,
      )

      // Trigger story discovery for newly enabled repos that have no stories
      const storyCount = await ctx.db
        .selectFrom('stories')
        .select(({ fn }) => [fn.countAll().as('count')])
        .where('repoId', '=', repo.id)
        .executeTakeFirst()

      const hasStories = Number(storyCount?.count ?? 0) > 0

      if (!hasStories) {
        const owner = await ctx.db
          .selectFrom('owners')
          .select(['login'])
          .where('id', '=', repo.ownerId)
          .executeTakeFirst()

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
})
