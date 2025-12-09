import { eq, schema } from '@app/db'
import { capturePostHogEvent, POSTHOG_EVENTS } from '@app/posthog'
import { tasks } from '@trigger.dev/sdk'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { requireRepoForUser } from '../../helpers/memberships'
import { protectedProcedure } from '../../trpc'

type Story = typeof schema.stories.$inferSelect

export const update = protectedProcedure
  .input(
    z.object({
      orgName: z.string(),
      repoName: z.string(),
      storyId: z.string(),
      name: z.string().min(1).optional(),
      story: z.string().min(1).optional(),
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
      where: (stories, { eq, and }) =>
        and(eq(stories.id, input.storyId), eq(stories.repoId, repo.id)),
    })

    if (!existingStory) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Story ${input.storyId} not found`,
      })
    }

    // Build update object
    const updateData: Partial<Story> = {}
    if (input.name !== undefined) {
      updateData.name = input.name
    }
    if (input.story !== undefined) {
      updateData.story = input.story
      updateData.decomposition = null
    }

    // Update story
    const updatedStoryResult = await ctx.db
      .update(schema.stories)
      .set(updateData)
      .where(eq(schema.stories.id, input.storyId))
      .returning()

    const updatedStory = updatedStoryResult[0]
    if (!updatedStory) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update story',
      })
    }

    // Track story edited event
    capturePostHogEvent(
      POSTHOG_EVENTS.STORY_EDITED,
      {
        story_id: updatedStory.id,
        repo_id: repo.id,
        org_name: input.orgName,
        repo_name: input.repoName,
        story_name: updatedStory.name ?? null,
        story_state: updatedStory.state,
        name_changed: input.name !== undefined,
        content_changed: input.story !== undefined,
      },
      userId,
    )

    // Trigger story composition task if story text was updated
    if (input.story !== undefined) {
      await tasks.trigger(
        'story-composition',
        {
          story: {
            id: updatedStory.id,
            text: updatedStory.story,
            title: input.name || updatedStory.name || '',
          },
          repo: {
            id: repo.id,
            slug: `${input.orgName}/${input.repoName}`,
            branchName: repo.defaultBranch ?? undefined,
          },
        },
        {
          tags: [`owner_${input.orgName}`, `repo_${input.repoName}`],
          priority: 10,
          idempotencyKey: `story-composition-${updatedStory.id}`,
        },
      )
    }

    return {
      story: updatedStory,
    }
  })
