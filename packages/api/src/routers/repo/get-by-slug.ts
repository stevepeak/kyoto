import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { findRepoForUser } from '../../helpers/memberships'
import { protectedProcedure } from '../../trpc'

export const getBySlug = protectedProcedure
  .input(z.object({ orgName: z.string(), repoName: z.string() }))
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
      return { repo: null }
    }

    return {
      repo: {
        id: repo.id,
        name: repo.name,
        defaultBranch: repo.defaultBranch,
        enabled: repo.enabled,
      },
    }
  })
