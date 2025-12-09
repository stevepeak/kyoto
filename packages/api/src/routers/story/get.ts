import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { findRepoForUser } from '../../helpers/memberships'
import { protectedProcedure } from '../../trpc'

export const get = protectedProcedure
  .input(
    z.object({
      orgName: z.string(),
      repoName: z.string(),
      storyId: z.string(),
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
      return { story: null }
    }

    // Query story
    const story = await ctx.db.query.stories.findFirst({
      where: (stories, { eq, and }) =>
        and(eq(stories.id, input.storyId), eq(stories.repoId, repo.id)),
    })

    if (!story) {
      return { story: null }
    }

    return { story }
  })
