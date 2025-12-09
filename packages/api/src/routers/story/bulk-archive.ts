import { and, eq, inArray, schema } from '@app/db'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { requireRepoForUser } from '../../helpers/memberships'
import { protectedProcedure } from '../../trpc'

export const bulkArchive = protectedProcedure
  .input(
    z.object({
      orgName: z.string(),
      repoName: z.string(),
      storyIds: z.array(z.string()).min(1),
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

    // Update all stories to archived state
    const updatedStories = await ctx.db
      .update(schema.stories)
      .set({ state: 'archived' })
      .where(
        and(
          eq(schema.stories.repoId, repo.id),
          inArray(schema.stories.id, input.storyIds),
        ),
      )
      .returning()

    return { count: updatedStories.length }
  })
