import { getSessionRecording } from '@app/browserbase'
import { getConfig } from '@app/config'
import { desc, eq, schema } from '@app/db'
import { capturePostHogEvent, POSTHOG_EVENTS } from '@app/posthog'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { auth, configure, schedules, tasks } from '@trigger.dev/sdk'
import { TRPCError } from '@trpc/server'
import { generateText } from 'ai'
import { dedent } from 'ts-dedent'
import { z } from 'zod'

import { protectedProcedure, router } from '../../../trpc'

let isTriggerConfigured = false

function ensureTriggerConfigured(secretKey: string) {
  if (!isTriggerConfigured) {
    configure({ accessToken: secretKey })
    isTriggerConfigured = true
  }
}

export const browserAgentsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const stories = await ctx.db
      .select()
      .from(schema.stories)
      .where(eq(schema.stories.userId, ctx.user.id))
      .orderBy(desc(schema.stories.updatedAt))

    return stories
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const story = await ctx.db.query.stories.findFirst({
        where: (stories, { and, eq }) =>
          and(eq(stories.id, input.id), eq(stories.userId, ctx.user.id)),
      })

      if (!story) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Story not found' })
      }

      const runs = await ctx.db
        .select()
        .from(schema.storyRuns)
        .where(eq(schema.storyRuns.storyId, story.id))
        .orderBy(desc(schema.storyRuns.createdAt))
        .limit(20)

      // Find active run with trigger handle for reconnection
      const activeRun = runs.find(
        (run) =>
          (run.status === 'pending' || run.status === 'running') &&
          run.triggerRunId,
      )

      return {
        story,
        runs,
        activeRun: activeRun
          ? {
              id: activeRun.id,
              triggerHandle: {
                id: activeRun.triggerRunId!,
              },
            }
          : null,
      }
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        instructions: z.string().min(1),
        testType: z.enum(['browser', 'vm']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [story] = await ctx.db
        .insert(schema.stories)
        .values({
          userId: ctx.user.id,
          name: input.name,
          instructions: input.instructions,
          testType: input.testType,
        })
        .returning()

      capturePostHogEvent(
        POSTHOG_EVENTS.STORY_CREATED,
        {
          story_id: story.id,
          story_name: story.name,
        },
        ctx.user.id,
      )

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
      const existing = await ctx.db.query.stories.findFirst({
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
            task: 'agent-scheduled',
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
        .update(schema.stories)
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
        .where(eq(schema.stories.id, input.id))
        .returning()

      capturePostHogEvent(
        POSTHOG_EVENTS.STORY_EDITED,
        {
          story_id: updated.id,
          story_name: updated.name,
          edited_fields: Object.keys(input).filter((key) => key !== 'id'),
        },
        ctx.user.id,
      )

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
      const existing = await ctx.db.query.stories.findFirst({
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

      await ctx.db.delete(schema.stories).where(eq(schema.stories.id, input.id))

      return { success: true }
    }),

  trigger: protectedProcedure
    .input(z.object({ storyId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      ensureTriggerConfigured(ctx.env.TRIGGER_SECRET_KEY)

      const story = await ctx.db.query.stories.findFirst({
        where: (stories, { and, eq }) =>
          and(eq(stories.id, input.storyId), eq(stories.userId, ctx.user.id)),
      })

      if (!story) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Story not found' })
      }

      // Check for existing active run (only 1 run per story in parallel)
      const activeRun = await ctx.db.query.storyRuns.findFirst({
        where: (runs, { and, eq, inArray }) =>
          and(
            eq(runs.storyId, input.storyId),
            inArray(runs.status, ['pending', 'running']),
          ),
      })

      if (activeRun) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A run is already in progress for this story',
        })
      }

      // Create a pending run
      const [run] = await ctx.db
        .insert(schema.storyRuns)
        .values({
          storyId: story.id,
          userId: ctx.user.id,
          status: 'pending',
        })
        .returning()

      // Trigger the appropriate task based on test type
      const taskId = story.testType === 'vm' ? 'vm-agent' : 'browser-agent'

      const handle = await tasks.trigger(taskId, {
        runId: run.id,
        storyId: story.id,
        instructions: story.instructions,
      })

      // Store trigger handle in the run record for reconnection on page reload
      const [updatedRun] = await ctx.db
        .update(schema.storyRuns)
        .set({
          triggerRunId: handle.id,
          updatedAt: new Date(),
        })
        .where(eq(schema.storyRuns.id, run.id))
        .returning()

      capturePostHogEvent(
        POSTHOG_EVENTS.STORY_RUN_MANUAL,
        {
          story_id: story.id,
          story_name: story.name,
          run_id: updatedRun.id,
        },
        ctx.user.id,
      )

      return {
        run: updatedRun,
        triggerHandle: {
          id: handle.id,
        },
      }
    }),

  getRunPublicAccessToken: protectedProcedure
    .input(z.object({ runId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const run = await ctx.db.query.storyRuns.findFirst({
        where: (runs, { and, eq }) =>
          and(eq(runs.triggerRunId, input.runId), eq(runs.userId, ctx.user.id)),
      })

      if (!run) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Run not found' })
      }

      ensureTriggerConfigured(ctx.env.TRIGGER_SECRET_KEY)

      const publicAccessToken = await auth.createPublicToken({
        scopes: {
          read: {
            runs: input.runId,
          },
        },
        expirationTime: '15m',
      })

      return { publicAccessToken }
    }),

  getRun: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const run = await ctx.db.query.storyRuns.findFirst({
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
      const story = await ctx.db.query.stories.findFirst({
        where: (stories, { and, eq }) =>
          and(eq(stories.id, input.storyId), eq(stories.userId, ctx.user.id)),
      })

      if (!story) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Story not found' })
      }

      const runs = await ctx.db
        .select()
        .from(schema.storyRuns)
        .where(eq(schema.storyRuns.storyId, input.storyId))
        .orderBy(desc(schema.storyRuns.createdAt))

      return runs
    }),

  getRecording: protectedProcedure
    .input(z.object({ runId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify user owns the run
      const run = await ctx.db.query.storyRuns.findFirst({
        where: (runs, { and, eq }) =>
          and(eq(runs.id, input.runId), eq(runs.userId, ctx.user.id)),
      })

      if (!run) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Run not found' })
      }

      if (run.terminalRecording) {
        return { type: 'terminal' as const, recording: run.terminalRecording }
      }

      if (run.sessionId) {
        const events = await getSessionRecording({
          apiKey: ctx.env.BROWSERBASE_API_KEY,
          sessionId: run.sessionId,
        })

        return { type: 'browser' as const, events }
      }

      return { type: 'none' as const }
    }),
})
