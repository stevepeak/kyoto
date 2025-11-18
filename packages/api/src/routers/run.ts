import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { tasks } from '@trigger.dev/sdk'
import { eq, and, inArray, desc } from 'drizzle-orm'

import { findRepoForUser, requireRepoForUser } from '../helpers/memberships'
import { protectedProcedure, router } from '../trpc'
import { runs, stories, storyTestResults } from '@app/db/schema'

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
      const dbRuns = await ctx.db
        .select()
        .from(runs)
        .where(eq(runs.repoId, repo.id))
        .orderBy(desc(runs.createdAt))

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

      const mappedRuns = dbRuns.map((run: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const createdAt = run.createdAt as Date
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const updatedAt = run.updatedAt as Date
        // Calculate duration in milliseconds
        const durationMs = updatedAt.getTime() - createdAt.getTime()

        return {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          id: run.id,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          runId: String(run.number),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          status: statusMap[run.status] ?? 'queued',

          createdAt: createdAt.toISOString(),

          updatedAt: updatedAt.toISOString(),
          durationMs,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          commitSha: run.commitSha ?? null,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          commitMessage: run.commitMessage ?? null,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          branchName: run.branchName,
        }
      })

      return { runs: mappedRuns }
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
      const runResult = await ctx.db
        .select()
        .from(runs)
        .where(and(eq(runs.repoId, repo.id), eq(runs.number, runNumber)))
        .limit(1)

      if (!runResult[0]) {
        return { run: null }
      }

      const run = runResult[0]

      // Extract story IDs from the stories JSONB
      const storyIds = (run.stories as Array<{ storyId: string }>).map(
        (s) => s.storyId,
      )

      // Fetch stories if there are any
      const fetchedStories =
        storyIds.length > 0
          ? await ctx.db
              .select()
              .from(stories)
              .where(inArray(stories.id, storyIds))
          : []

      const storyResults = await ctx.db
        .select({
          id: storyTestResults.id,
          storyId: storyTestResults.storyId,
          status: storyTestResults.status,
          analysisVersion: storyTestResults.analysisVersion,
          analysis: storyTestResults.analysis,
          startedAt: storyTestResults.startedAt,
          completedAt: storyTestResults.completedAt,
          durationMs: storyTestResults.durationMs,
          createdAt: storyTestResults.createdAt,
          updatedAt: storyTestResults.updatedAt,
          extTriggerDev: storyTestResults.extTriggerDev,
        })
        .from(storyTestResults)
        .where(eq(storyTestResults.runId, run.id))

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
