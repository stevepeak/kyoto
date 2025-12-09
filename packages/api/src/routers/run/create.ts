import { tasks } from '@trigger.dev/sdk'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { requireRepoForUser } from '../../helpers/memberships'
import { protectedProcedure } from '../../trpc'

/**
 * Starts a new CI run for a given repo, optionally on a specific branch.
 *
 * This endpoint will:
 * 1. Check user authentication (must be authorized for the repo).
 * 2. Confirm the user has access to the given org/repo.
 * 3. Configure the Trigger.dev client using environment secrets.
 * 4. Enqueue a "run-ci" task with TRIGGER.dev, including the org slug, repo name,
 *    branch name (if provided), and the requested agent version.
 * 5. Return `{ success: true }` on success.
 */
export const create = protectedProcedure
  .input(
    z.object({
      orgName: z.string(),
      repoName: z.string(),
      branchName: z.string().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.user?.id

    if (!userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }

    await requireRepoForUser(ctx.db, {
      orgName: input.orgName,
      repoName: input.repoName,
      userId,
    })

    const handle = await tasks.trigger(
      'run-ci',
      {
        orgName: input.orgName,
        repoName: input.repoName,
        branchName: input.branchName,
      },
      {
        tags: [
          `org_${input.orgName}`,
          `repo_${input.repoName}`,
          `user_${userId}`,
        ],
        priority: 10,
      },
    )

    return {
      success: true,
      triggerHandle: {
        publicAccessToken: handle.publicAccessToken,
        id: handle.id,
      },
    }
  })
