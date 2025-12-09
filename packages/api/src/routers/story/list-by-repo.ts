import { and, asc, desc, eq, inArray, ne, schema } from '@app/db'
import { type TestStatus } from '@app/schemas'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { findRepoForUser } from '../../helpers/memberships'
import { protectedProcedure } from '../../trpc'

export const listByRepo = protectedProcedure
  .input(
    z.object({
      orgName: z.string(),
      repoName: z.string(),
    }),
  )
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
      return { stories: [] }
    }

    const stories = await ctx.db
      .select()
      .from(schema.stories)
      .where(
        and(
          eq(schema.stories.repoId, repo.id),
          ne(schema.stories.state, 'archived'),
        ),
      )
      .orderBy(desc(schema.stories.createdAt))

    const storyIds = stories.map((story) => story.id)

    let latestStatuses = new Map<
      string,
      { status: TestStatus; createdAt: Date | null }
    >()

    if (storyIds.length > 0) {
      const statusRows = await ctx.db
        .select({
          storyId: schema.storyTestResults.storyId,
          status: schema.storyTestResults.status,
          createdAt: schema.storyTestResults.createdAt,
        })
        .from(schema.storyTestResults)
        .where(
          and(
            inArray(schema.storyTestResults.storyId, storyIds),
            ne(schema.storyTestResults.status, 'running'),
          ),
        )
        .orderBy(
          asc(schema.storyTestResults.storyId),
          desc(schema.storyTestResults.createdAt),
          desc(schema.storyTestResults.id),
        )

      latestStatuses = statusRows.reduce((acc, row) => {
        if (!acc.has(row.storyId)) {
          acc.set(row.storyId, {
            status: row.status as TestStatus,
            createdAt: row.createdAt ?? null,
          })
        }
        return acc
      }, new Map<string, { status: TestStatus; createdAt: Date | null }>())
    }

    return {
      stories: stories.map((story) => ({
        id: story.id,
        name: story.name,
        story: story.story,
        state: story.state,
        createdAt: story.createdAt?.toISOString() ?? null,
        updatedAt: story.updatedAt?.toISOString() ?? null,
        groups: [], // Files column removed - groups no longer derived from files
        latestStatus: latestStatuses.get(story.id)?.status ?? null,
        latestStatusAt:
          latestStatuses.get(story.id)?.createdAt?.toISOString() ?? null,
      })),
    }
  })
