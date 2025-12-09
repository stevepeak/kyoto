import { count, eq, schema } from '@app/db'
import { capturePostHogEvent, POSTHOG_EVENTS } from '@app/posthog'
import { tasks } from '@trigger.dev/sdk'
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

    // Trigger story discovery for newly enabled repos that have no stories
    const storyCount = await ctx.db
      .select({
        count: count(),
      })
      .from(schema.stories)
      .where(eq(schema.stories.repoId, repo.id))
      .limit(1)

    const hasStories = Number(storyCount[0]?.count ?? 0) > 0

    if (!hasStories) {
      const ownerResults = await ctx.db
        .select({
          login: schema.owners.login,
        })
        .from(schema.owners)
        .where(eq(schema.owners.id, repo.ownerId))
        .limit(1)

      const owner = ownerResults[0] ?? null

      if (owner) {
        const repoSlug = `${owner.login}/${repo.name}`

        await tasks.trigger(
          'discover-stories',
          {
            repoSlug,
            storyCount: 3,
            save: true,
          },
          {
            tags: [`owner_${owner.login}`, `repo_${repo.name}`],
            priority: 10,
          },
        )
      }
    }

    return { enabled: true, repoId: repo.id }
  })
