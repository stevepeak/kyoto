import { and, eq, inArray, schema } from '@app/db'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { findRepoForUser } from '../../helpers/memberships'
import { protectedProcedure } from '../../trpc'

export const getByRunId = protectedProcedure
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
    const runResults = await ctx.db
      .select()
      .from(schema.runs)
      .where(
        and(eq(schema.runs.repoId, repo.id), eq(schema.runs.number, runNumber)),
      )
      .limit(1)

    const run = runResults[0] ?? null

    if (!run) {
      return { run: null }
    }

    // Extract story IDs from the stories JSONB
    const stories = run.stories as { storyId: string }[]
    const storyIds = stories.map((s) => s.storyId)

    // Fetch stories if there are any
    const fetchedStories =
      storyIds.length > 0
        ? await ctx.db
            .select()
            .from(schema.stories)
            .where(inArray(schema.stories.id, storyIds))
        : []

    const storyResults = await ctx.db
      .select({
        id: schema.storyTestResults.id,
        storyId: schema.storyTestResults.storyId,
        status: schema.storyTestResults.status,
        analysisVersion: schema.storyTestResults.analysisVersion,
        analysis: schema.storyTestResults.analysis,
        startedAt: schema.storyTestResults.startedAt,
        completedAt: schema.storyTestResults.completedAt,
        durationMs: schema.storyTestResults.durationMs,
        createdAt: schema.storyTestResults.createdAt,
        updatedAt: schema.storyTestResults.updatedAt,
        extTriggerDev: schema.storyTestResults.extTriggerDev,
      })
      .from(schema.storyTestResults)
      .where(eq(schema.storyTestResults.runId, run.id))

    return {
      run,
      stories: fetchedStories,
      storyResults,
    }
  })
