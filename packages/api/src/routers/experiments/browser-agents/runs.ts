import { getSessionRecording } from '@app/browserbase'
import { desc, eq, schema } from '@app/db'
import { capturePostHogEvent, POSTHOG_EVENTS } from '@app/posthog'
import { auth, configure, tasks } from '@trigger.dev/sdk'
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

export const runsRouter = router({
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
