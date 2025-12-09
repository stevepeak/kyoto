import { tasks } from '@trigger.dev/sdk'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { findStoryForUser } from '../../helpers/memberships'
import { protectedProcedure } from '../../trpc'

export const test = protectedProcedure
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

    const runHandle = await tasks.trigger('test-story', {
      storyId: input.storyId,
      runId: null,
    })

    return {
      queued: true,
      runId: runHandle.id,
    }
  })
