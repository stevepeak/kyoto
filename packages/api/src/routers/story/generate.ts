import { eq, schema } from '@app/db'
import { tasks } from '@trigger.dev/sdk'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { requireRepoForUser } from '../../helpers/memberships'
import { protectedProcedure } from '../../trpc'

export const generate = protectedProcedure
  .input(
    z.object({
      orgName: z.string(),
      repoName: z.string(),
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

    // Get owner info for repo slug
    const owner = await ctx.db.query.owners.findFirst({
      where: eq(schema.owners.id, repo.ownerId),
    })

    if (!owner) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Owner not found',
      })
    }

    const repoSlug = `${owner.login}/${repo.name}`

    // Trigger the discover-stories task
    const handle = await tasks.trigger(
      'discover-stories',
      {
        repoSlug,
        storyCount: 1,
      },
      {
        tags: [`owner_${owner.login}`, `repo_${repo.name}`],
        priority: 10,
        idempotencyKey: `discover-stories-${repo.id}`,
        idempotencyKeyTTL: '1m',
      },
    )

    return {
      triggerHandle: {
        publicAccessToken: handle.publicAccessToken,
        id: handle.id,
      },
    }
  })
