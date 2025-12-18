import { generateStoryTitle, parseCron } from '@app/agents'
import { desc, eq, schema } from '@app/db'
import { capturePostHogEvent, POSTHOG_EVENTS } from '@app/posthog'
import { validateCronMinimumInterval } from '@app/utils'
import { configure, schedules } from '@trigger.dev/sdk'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { protectedProcedure, router } from '../../../trpc'

let isTriggerConfigured = false

function ensureTriggerConfigured(secretKey: string) {
  if (!isTriggerConfigured) {
    configure({ accessToken: secretKey })
    isTriggerConfigured = true
  }
}

export const storiesRouter = router({
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
      let storyName = input.name

      // Generate title if still "New Story"
      if (input.name === 'New Story') {
        try {
          storyName = await generateStoryTitle(input.instructions)
        } catch (error) {
          // If title generation fails, keep "New Story" as fallback
          // eslint-disable-next-line no-console
          console.error('Failed to generate story title:', error)
        }
      }

      const [story] = await ctx.db
        .insert(schema.stories)
        .values({
          userId: ctx.user.id,
          name: storyName,
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

      // Validate cron schedule minimum interval if provided
      if (input.cronSchedule) {
        const validation = validateCronMinimumInterval(input.cronSchedule)
        if (!validation.isValid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: validation.error ?? 'Invalid cron schedule',
          })
        }
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

      // Generate title if name is "New Story"
      let storyName: string | undefined = input.name
      if (input.name !== undefined && input.name === 'New Story') {
        // Use new instructions if provided, otherwise use existing
        const instructionsToUse = input.instructions ?? existing.instructions
        try {
          storyName = await generateStoryTitle(instructionsToUse)
        } catch (error) {
          // If title generation fails, keep "New Story" as fallback
          // eslint-disable-next-line no-console
          console.error('Failed to generate story title:', error)
        }
      }

      const [updated] = await ctx.db
        .update(schema.stories)
        .set({
          ...(input.name !== undefined ? { name: storyName } : {}),
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
      const cronSchedule = await parseCron(input.text)

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
})
