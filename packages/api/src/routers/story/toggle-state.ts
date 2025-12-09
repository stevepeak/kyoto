import { and, eq, schema } from '@app/db'
import { capturePostHogEvent, POSTHOG_EVENTS } from '@app/posthog'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { requireRepoForUser } from '../../helpers/memberships'
import { protectedProcedure } from '../../trpc'

export const toggleState = protectedProcedure
  .input(
    z.object({
      orgName: z.string(),
      repoName: z.string(),
      storyId: z.string(),
      state: z.enum(['active', 'paused', 'planned', 'archived']),
    }),
  )
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

    // Check if story exists and belongs to repo
    const existingStory = await ctx.db.query.stories.findFirst({
      where: and(
        eq(schema.stories.id, input.storyId),
        eq(schema.stories.repoId, repo.id),
      ),
    })

    if (!existingStory) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Story ${input.storyId} not found`,
      })
    }

    const updatedStoryResult = await ctx.db
      .update(schema.stories)
      .set({ state: input.state })
      .where(eq(schema.stories.id, input.storyId))
      .returning()

    const updatedStory = updatedStoryResult[0]
    if (!updatedStory) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update story',
      })
    }

    // Track story generated to accepted event
    if (existingStory.state === 'generated' && input.state === 'active') {
      capturePostHogEvent(
        POSTHOG_EVENTS.STORY_GENERATED_TO_ACCEPTED,
        {
          story_id: updatedStory.id,
          repo_id: repo.id,
          org_name: input.orgName,
          repo_name: input.repoName,
          story_name: updatedStory.name ?? null,
        },
        userId,
      )
    }

    return { story: updatedStory }
  })
