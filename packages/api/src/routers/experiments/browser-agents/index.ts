import { getConfig } from '@app/config'
import { desc, eq, schema } from '@app/db'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { configure, schedules, tasks } from '@trigger.dev/sdk'
import { TRPCError } from '@trpc/server'
import { generateText } from 'ai'
import { dedent } from 'ts-dedent'
import { z } from 'zod'

import { protectedProcedure, router } from '../../../trpc'

let isTriggerConfigured = false

function ensureTriggerConfigured(secretKey: string) {
  if (!isTriggerConfigured) {
    configure({ secretKey })
    isTriggerConfigured = true
  }
}

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
        scheduleText: z.string().nullable().optional(),
        cronSchedule: z.string().nullable().optional(),
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

      if (input.scheduleText && !input.cronSchedule) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid schedule text',
        })
      }

      // Handle schedule management
      let triggerScheduleId = existing.triggerScheduleId

      if (input.cronSchedule !== undefined) {
        ensureTriggerConfigured(ctx.env.TRIGGER_SECRET_KEY)

        if (input.cronSchedule) {
          // Create or update schedule
          const createdSchedule = await schedules.create({
            task: 'xp-browser-agent-scheduled',
            cron: input.cronSchedule,
            timezone: ctx.user.timeZone ?? 'UTC',
            externalId: input.id,
            deduplicationKey: `story-${input.id}`,
          })
          triggerScheduleId = createdSchedule.id
        } else if (existing.triggerScheduleId) {
          // Delete existing schedule
          await schedules.del(existing.triggerScheduleId)
          triggerScheduleId = null
        }
      }

      const [updated] = await ctx.db
        .update(schema.xpStories)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.instructions !== undefined
            ? { instructions: input.instructions }
            : {}),
          ...(input.scheduleText !== undefined
            ? { scheduleText: input.scheduleText }
            : {}),
          ...(input.cronSchedule !== undefined
            ? { cronSchedule: input.cronSchedule }
            : {}),
          triggerScheduleId,
          updatedAt: new Date(),
        })
        .where(eq(schema.xpStories.id, input.id))
        .returning()

      return updated
    }),

  parseCron: protectedProcedure
    .input(z.object({ text: z.string().min(1).max(500) }))
    .mutation(async ({ input }) => {
      const config = getConfig()
      const openrouter = createOpenRouter({
        apiKey: config.OPENROUTER_API_KEY,
      })

      const result = await generateText({
        model: openrouter('openai/gpt-4o-mini'),
        prompt: dedent`
          Convert the following natural language schedule into a cron expression.
          
          Input: "${input.text}"
          
          Rules:
          - Output ONLY the cron expression, nothing else
          - Use standard 5-field cron format: minute hour day-of-month month day-of-week
          - If the input is ambiguous, make a reasonable interpretation
          - Examples:
            - "every hour" → "0 * * * *"
            - "every day at 5pm" → "0 17 * * *"
            - "every monday at 9am" → "0 9 * * 1"
            - "every 30 minutes" → "*/30 * * * *"
          
          Output the cron expression:
        `,
      })

      const cronSchedule = result.text.trim()

      // Basic validation: should have 5 space-separated parts
      const parts = cronSchedule.split(/\s+/)
      if (parts.length !== 5) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Failed to parse schedule. Please try a different phrasing.',
        })
      }

      return { cronSchedule }
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

      // Delete the schedule if it exists
      if (existing.triggerScheduleId) {
        ensureTriggerConfigured(ctx.env.TRIGGER_SECRET_KEY)
        await schedules.del(existing.triggerScheduleId)
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
