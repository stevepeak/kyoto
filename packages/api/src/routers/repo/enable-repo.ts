import { eq, schema } from '@app/db'
import { capturePostHogEvent, POSTHOG_EVENTS } from '@app/posthog'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { requireRepoForUser } from '../../helpers/memberships'
import { protectedProcedure } from '../../trpc'

export const enableRepo = protectedProcedure
  .input(z.object({ orgName: z.string(), repoName: z.string() }))
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

    if (repo.enabled) {
      return { enabled: true, repoId: repo.id }
    }

    await ctx.db
      .update(schema.repos)
      .set({ enabled: true })
      .where(eq(schema.repos.id, repo.id))

    // Track repo added event
    capturePostHogEvent(
      POSTHOG_EVENTS.REPO_ADDED,
      {
        repo_id: repo.id,
        repo_name: repo.name,
        repo_full_name: repo.fullName ?? null,
        owner_id: repo.ownerId,
        org_name: input.orgName,
      },
      userId,
    )

    return { enabled: true, repoId: repo.id }
  })
