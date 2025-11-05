import { z } from 'zod'

import type { RunStory } from '@app/db'
import { protectedProcedure, router } from '../trpc'

export const actionRouter = router({
  listByRepo: protectedProcedure
    .input(z.object({ orgSlug: z.string(), repoName: z.string() }))
    .query(() => {
      const actions = [
        {
          id: 'a1',
          runId: '101',
          status: 'success' as const,
          createdAt: new Date().toISOString(),
          commitSha: 'abc1234',
        },
        {
          id: 'a2',
          runId: '102',
          status: 'running' as const,
          createdAt: new Date().toISOString(),
          commitSha: 'def5678',
        },
      ]
      return { actions }
    }),

  getByRunId: protectedProcedure
    .input(
      z.object({
        orgSlug: z.string(),
        repoName: z.string(),
        runId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Look up owner
      const owner = await ctx.db
        .selectFrom('owners')
        .selectAll()
        .where('login', '=', input.orgSlug)
        .executeTakeFirst()

      if (!owner) {
        return { run: null }
      }

      // Look up repo
      const repo = await ctx.db
        .selectFrom('repos')
        .selectAll()
        .where('ownerId', '=', owner.id)
        .where('name', '=', input.repoName)
        .executeTakeFirst()

      if (!repo) {
        return { run: null }
      }

      // Look up run
      // Note: runs table types will be generated after migration runs
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const run = await (ctx.db as any)
        .selectFrom('runs')
        .selectAll()
        .where('repoId', '=', repo.id)
        .where('id', '=', input.runId)
        .executeTakeFirst()

      if (!run) {
        return { run: null }
      }

      // Extract story IDs from the stories JSONB
      const storyIds = (run.stories as RunStory[]).map((s) => s.storyId)

      // Fetch stories if there are any
      const fetchedStories =
        storyIds.length > 0
          ? await ctx.db
              .selectFrom('stories')
              .selectAll()
              .where('id', 'in', storyIds)
              .execute()
          : []

      const stories = fetchedStories.map((s) => ({
        id: s.id,
        name: s.name,
        story: s.story,
        branchName: s.branchName,
        commitSha: s.commitSha,
        createdAt: s.createdAt ?? new Date(),
        updatedAt: s.updatedAt ?? new Date(),
      }))

      // Create a map of story ID to story data
      const storyMap = new Map(stories.map((s) => [s.id, s]))

      // Combine run stories with actual story data
      const storiesWithStatus = (run.stories as RunStory[]).map((runStory) => {
        const story = storyMap.get(runStory.storyId)
        return {
          storyId: runStory.storyId,
          status: runStory.status,
          story: story
            ? {
                id: story.id,
                name: story.name,
                story: story.story,
                branchName: story.branchName,
                commitSha: story.commitSha,
                createdAt: story.createdAt.toISOString(),
                updatedAt: story.updatedAt.toISOString(),
              }
            : null,
        }
      })

      // Type assertion needed until migration runs and types are regenerated
      type RunRow = {
        id: string
        commitSha: string
        branchName: string
        commitMessage: string | null
        prNumber: string | null
        status: 'pass' | 'fail' | 'skipped'
        summary: string | null
        createdAt: Date
        updatedAt: Date
        stories: RunStory[]
      }

      const runRow = run as unknown as RunRow

      return {
        run: {
          id: runRow.id,
          commitSha: runRow.commitSha,
          branchName: runRow.branchName,
          commitMessage: runRow.commitMessage,
          prNumber: runRow.prNumber,
          status: runRow.status,
          summary: runRow.summary,
          createdAt: runRow.createdAt.toISOString(),
          updatedAt: runRow.updatedAt.toISOString(),
          stories: storiesWithStatus,
        },
      }
    }),
})
