import { tasks } from '@trigger.dev/sdk'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { findRepoForUser, requireRepoForUser } from '../helpers/memberships.js'
import { protectedProcedure, router } from '../trpc.js'

export const runRouter = router({
  listByRepo: protectedProcedure
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
        return { runs: [] }
      }

      // Query runs for this repo
      // Note: runs table types will be generated after migration runs
      const dbRuns = await ctx.db
        .selectFrom('runs')
        .selectAll()
        .where('repoId', '=', repo.id)
        .orderBy('createdAt', 'desc')
        .execute()

      // Map database runs to frontend format
      // Map status: 'pass' -> 'success', 'fail' -> 'failed', 'skipped' -> 'skipped', 'running' -> 'running'
      const statusMap: Record<
        string,
        'queued' | 'running' | 'success' | 'failed' | 'skipped' | 'error'
      > = {
        pass: 'success',
        fail: 'failed',
        skipped: 'skipped',
        running: 'running',
        error: 'error',
      }

      const runs = dbRuns.map((run) => {
        const createdAt = run.createdAt as Date
        const updatedAt = run.updatedAt as Date
        // Calculate duration in milliseconds
        const durationMs = updatedAt.getTime() - createdAt.getTime()

        return {
          id: run.id,
          runId: String(run.number),
          status: statusMap[run.status] ?? 'queued',

          createdAt: createdAt.toISOString(),

          updatedAt: updatedAt.toISOString(),
          durationMs,
          commitSha: run.commitSha ?? null,
          commitMessage: run.commitMessage ?? null,
          branchName: run.branchName,
        }
      })

      return { runs }
    }),

  getByRunId: protectedProcedure
    .input(
      z.object({
        orgName: z.string(),
        repoName: z.string(),
        runId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Parse runId as number (should be numeric like "101")
      const runNumber = Number.parseInt(input.runId, 10)
      if (Number.isNaN(runNumber) || runNumber < 1) {
        return { run: null }
      }

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
        return { run: null }
      }

      // Look up run by repo_id and number (not UUID)
      // Note: runs table types will be generated after migration runs
      const run = await ctx.db
        .selectFrom('runs')
        .selectAll()
        .where('repoId', '=', repo.id)
        .where('number', '=', runNumber)
        .executeTakeFirst()

      if (!run) {
        return { run: null }
      }

      // Extract story IDs from the stories JSONB
      const storyIds = run.stories.map((s) => s.storyId)

      // Fetch stories if there are any
      const fetchedStories =
        storyIds.length > 0
          ? await ctx.db
              .selectFrom('stories')
              .selectAll()
              .where('id', 'in', storyIds)
              .execute()
          : []

      const storyResults = await ctx.db
        .selectFrom('storyTestResults')
        .select([
          'id',
          'storyId',
          'status',
          'analysisVersion',
          'analysis',
          'startedAt',
          'completedAt',
          'durationMs',
          'createdAt',
          'updatedAt',
          'extTriggerDev',
        ])
        .where('runId', '=', run.id)
        .execute()

      return {
        run,
        stories: fetchedStories,
        storyResults,
      }
    }),

  /**
   * Starts a new CI run for a given repo, optionally on a specific branch.
   *
   * This endpoint will:
   * 1. Check user authentication (must be authorized for the repo).
   * 2. Confirm the user has access to the given org/repo.
   * 3. Configure the Trigger.dev client using environment secrets.
   * 4. Enqueue a "run-ci" task with TRIGGER.dev, including the org slug, repo name,
   *    branch name (if provided), and the requested agent version.
   * 5. Return `{ success: true }` on success.
   */
  create: protectedProcedure
    .input(
      z.object({
        orgName: z.string(),
        repoName: z.string(),
        branchName: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id

      if (!userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      await requireRepoForUser(ctx.db, {
        orgName: input.orgName,
        repoName: input.repoName,
        userId,
      })

      const handle = await tasks.trigger(
        'run-ci',
        {
          orgName: input.orgName,
          repoName: input.repoName,
          branchName: input.branchName,
        },
        {
          tags: [
            `org_${input.orgName}`,
            `repo_${input.repoName}`,
            `user_${userId}`,
          ],
          priority: 10,
        },
      )

      return {
        success: true,
        triggerHandle: {
          publicAccessToken: handle.publicAccessToken,
          id: handle.id,
        },
      }
    }),
})
