import { eq, schema } from '@app/db'
import { tasks } from '@trigger.dev/sdk'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { findStoryForUser } from '../../helpers/memberships'
import { protectedProcedure } from '../../trpc'

export const decompose = protectedProcedure
  .input(
    z.object({
      storyId: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.user?.id

    if (!userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }

    const storyWithRepo = await findStoryForUser(ctx.db, {
      storyId: input.storyId,
      userId,
    })

    if (!storyWithRepo) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Story not accessible',
      })
    }

    // Get owner info for repo slug
    const owner = await ctx.db.query.owners.findFirst({
      where: eq(schema.owners.id, storyWithRepo.repo.ownerId),
    })

    if (!owner) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Owner not found',
      })
    }

    const runHandle = await tasks.trigger(
      'story-composition',
      {
        story: {
          id: storyWithRepo.story.id,
          text: storyWithRepo.story.story,
          title: storyWithRepo.story.name || '',
        },
        repo: {
          id: storyWithRepo.repo.id,
          slug: `${owner.login}/${storyWithRepo.repo.name}`,
        },
      },
      {
        tags: [`owner_${owner.login}`, `repo_${storyWithRepo.repo.name}`],
        priority: 10,
        idempotencyKey: `story-composition-${storyWithRepo.story.id}`,
      },
    )

    return {
      queued: true,
      runId: runHandle.id,
    }
  })
