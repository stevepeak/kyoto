import { desc, eq, schema } from '@app/db'
import { tasks } from '@trigger.dev/sdk'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { protectedProcedure, router } from '../../../trpc'

export const xpBrowserAgentsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const stories = await ctx.db
      .select()
      .from(schema.xpStories)
      .where(eq(schema.xpStories.userId, ctx.user.id))
      .orderBy(desc(schema.xpStories.updatedAt))

    return stories
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const story = await ctx.db.query.xpStories.findFirst({
        where: (stories, { and, eq }) =>
          and(eq(stories.id, input.id), eq(stories.userId, ctx.user.id)),
      })

      if (!story) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Story not found' })
      }

      const runs = await ctx.db
        .select()
        .from(schema.xpStoriesRuns)
        .where(eq(schema.xpStoriesRuns.storyId, story.id))
        .orderBy(desc(schema.xpStoriesRuns.createdAt))
        .limit(20)

      return { story, runs }
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        instructions: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [story] = await ctx.db
        .insert(schema.xpStories)
        .values({
          userId: ctx.user.id,
          name: input.name,
          instructions: input.instructions,
        })
        .returning()

      return story
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        instructions: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.xpStories.findFirst({
        where: (stories, { and, eq }) =>
          and(eq(stories.id, input.id), eq(stories.userId, ctx.user.id)),
      })

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Story not found' })
      }

      const [updated] = await ctx.db
        .update(schema.xpStories)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.instructions !== undefined
            ? { instructions: input.instructions }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(schema.xpStories.id, input.id))
        .returning()

      return updated
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.xpStories.findFirst({
        where: (stories, { and, eq }) =>
          and(eq(stories.id, input.id), eq(stories.userId, ctx.user.id)),
      })

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Story not found' })
      }

      await ctx.db
        .delete(schema.xpStories)
        .where(eq(schema.xpStories.id, input.id))

      return { success: true }
    }),

  trigger: protectedProcedure
    .input(z.object({ storyId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const story = await ctx.db.query.xpStories.findFirst({
        where: (stories, { and, eq }) =>
          and(eq(stories.id, input.storyId), eq(stories.userId, ctx.user.id)),
      })

      if (!story) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Story not found' })
      }

      // Create a pending run
      const [run] = await ctx.db
        .insert(schema.xpStoriesRuns)
        .values({
          storyId: story.id,
          userId: ctx.user.id,
          status: 'pending',
        })
        .returning()

      // Trigger the background task
      const handle = await tasks.trigger('xp-browser-agent', {
        runId: run.id,
        storyId: story.id,
        instructions: story.instructions,
      })

      return {
        run,
        triggerHandle: {
          id: handle.id,
          publicAccessToken: handle.publicAccessToken,
        },
      }
    }),

  getRun: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const run = await ctx.db.query.xpStoriesRuns.findFirst({
        where: (runs, { and, eq }) =>
          and(eq(runs.id, input.id), eq(runs.userId, ctx.user.id)),
      })

      if (!run) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Run not found' })
      }

      return run
    }),

  listRuns: protectedProcedure
    .input(z.object({ storyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify user owns the story
      const story = await ctx.db.query.xpStories.findFirst({
        where: (stories, { and, eq }) =>
          and(eq(stories.id, input.storyId), eq(stories.userId, ctx.user.id)),
      })

      if (!story) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Story not found' })
      }

      const runs = await ctx.db
        .select()
        .from(schema.xpStoriesRuns)
        .where(eq(schema.xpStoriesRuns.storyId, input.storyId))
        .orderBy(desc(schema.xpStoriesRuns.createdAt))

      return runs
    }),
})
