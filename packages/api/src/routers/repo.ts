import { z } from 'zod'

import { protectedProcedure, router } from '../trpc'

export const repoRouter = router({
  listByOrg: protectedProcedure
    .input(z.object({ orgSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const owner = await ctx.db
        .selectFrom('owners')
        .selectAll()
        .where('login', '=', input.orgSlug)
        .executeTakeFirst()

      if (!owner) {
        return {
          repos: [] as Array<{
            id: string
            name: string
            defaultBranch: string | null
            enabled: boolean
          }>,
        }
      }

      const repos = await ctx.db
        .selectFrom('repos')
        .select(['id', 'name', 'defaultBranch', 'enabled'])
        .where('ownerId', '=', owner.id)
        .orderBy('name')
        .execute()

      return { repos }
    }),

  getBySlug: protectedProcedure
    .input(z.object({ orgSlug: z.string(), repoName: z.string() }))
    .query(async ({ ctx, input }) => {
      const owner = await ctx.db
        .selectFrom('owners')
        .selectAll()
        .where('login', '=', input.orgSlug)
        .executeTakeFirst()

      if (!owner) {
        return { repo: null }
      }

      const repo = await ctx.db
        .selectFrom('repos')
        .select(['id', 'name', 'defaultBranch', 'enabled'])
        .where('ownerId', '=', owner.id)
        .where('name', '=', input.repoName)
        .executeTakeFirst()

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
    }),

  enableRepo: protectedProcedure
    .input(z.object({ orgSlug: z.string(), repoName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const owner = await ctx.db
        .selectFrom('owners')
        .selectAll()
        .where('login', '=', input.orgSlug)
        .executeTakeFirst()

      if (!owner) {
        throw new Error(`Owner with slug ${input.orgSlug} not found`)
      }

      // Check if repo exists
      const repo = await ctx.db
        .selectFrom('repos')
        .selectAll()
        .where('ownerId', '=', owner.id)
        .where('name', '=', input.repoName)
        .executeTakeFirst()

      if (!repo) {
        throw new Error(
          `Repository ${input.repoName} not found for owner ${input.orgSlug}`,
        )
      }

      // Check if already enabled
      if (repo.enabled) {
        return { enabled: true, repoId: repo.id }
      }

      // Enable the repo
      await ctx.db
        .updateTable('repos')
        .set({ enabled: true })
        .where('id', '=', repo.id)
        .execute()

      return { enabled: true, repoId: repo.id }
    }),

  disableRepo: protectedProcedure
    .input(z.object({ orgSlug: z.string(), repoName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const owner = await ctx.db
        .selectFrom('owners')
        .selectAll()
        .where('login', '=', input.orgSlug)
        .executeTakeFirst()

      if (!owner) {
        throw new Error(`Owner with slug ${input.orgSlug} not found`)
      }

      // Check if repo exists
      const repo = await ctx.db
        .selectFrom('repos')
        .selectAll()
        .where('ownerId', '=', owner.id)
        .where('name', '=', input.repoName)
        .executeTakeFirst()

      if (!repo) {
        throw new Error(
          `Repository ${input.repoName} not found for owner ${input.orgSlug}`,
        )
      }

      // Disable the repo
      await ctx.db
        .updateTable('repos')
        .set({ enabled: false })
        .where('id', '=', repo.id)
        .execute()

      return { enabled: false, repoId: repo.id }
    }),
})
