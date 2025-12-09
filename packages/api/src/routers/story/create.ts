import { schema } from '@app/db'
import { capturePostHogEvent, POSTHOG_EVENTS } from '@app/posthog'
import { tasks } from '@trigger.dev/sdk'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { requireRepoForUser } from '../../helpers/memberships'
import { protectedProcedure } from '../../trpc'

export const create = protectedProcedure
  .input(
    z.object({
      orgName: z.string(),
      repoName: z.string(),
      name: z
        .string()
        .optional()
        .default('')
        .describe('Generated if not provided.'),
      story: z.string().min(1),
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

    // Create story
    const newStoryResult = await ctx.db
      .insert(schema.stories)
      .values({
        repoId: repo.id,
        name: input.name,
        story: input.story,
        state: 'active',
      })
      .returning()

    const newStory = newStoryResult[0]
    if (!newStory) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create story',
      })
    }

    // Track story written event
    capturePostHogEvent(
      POSTHOG_EVENTS.STORY_WRITTEN,
      {
        story_id: newStory.id,
        repo_id: repo.id,
        org_name: input.orgName,
        repo_name: input.repoName,
        story_name: newStory.name ?? null,
        story_state: newStory.state,
      },
      userId,
    )

    // Trigger story composition task
    await tasks.trigger(
      'story-composition',
      {
        story: {
          id: newStory.id,
          text: newStory.story,
          title: input.name?.trim() || '',
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
        idempotencyKey: `story-composition-${newStory.id}`,
      },
    )

    return {
      story: newStory,
    }
  })
