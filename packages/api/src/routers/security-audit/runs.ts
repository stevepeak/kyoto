import { desc, eq, schema } from '@app/db'
import { capturePostHogEvent, POSTHOG_EVENTS } from '@app/posthog'
import { configure, tasks } from '@trigger.dev/sdk'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { protectedProcedure, router } from '../../trpc'

let isTriggerConfigured = false

function ensureTriggerConfigured(secretKey: string) {
  if (!isTriggerConfigured) {
    configure({ accessToken: secretKey })
    isTriggerConfigured = true
  }
}

export const securityAuditRunsRouter = router({
  trigger: protectedProcedure
    .input(z.object({ auditId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      ensureTriggerConfigured(ctx.env.TRIGGER_SECRET_KEY)

      const audit = await ctx.db.query.securityAudits.findFirst({
        where: (audits, { and, eq }) =>
          and(eq(audits.id, input.auditId), eq(audits.userId, ctx.user.id)),
      })

      if (!audit) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Security audit not found',
        })
      }

      // Check for existing active run
      const activeRun = await ctx.db.query.securityAuditRuns.findFirst({
        where: (runs, { and, eq, inArray }) =>
          and(
            eq(runs.auditId, input.auditId),
            inArray(runs.status, ['pending', 'running']),
          ),
      })

      if (activeRun) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A run is already in progress for this security audit',
        })
      }

      // Create a pending run
      const [run] = await ctx.db
        .insert(schema.securityAuditRuns)
        .values({
          auditId: audit.id,
          status: 'pending',
        })
        .returning()

      // Trigger the security audit task
      const handle = await tasks.trigger('security-audit', {
        runId: run.id,
        auditId: audit.id,
        targetUrl: audit.targetUrl,
      })

      // Store trigger handle in the run record
      const [updatedRun] = await ctx.db
        .update(schema.securityAuditRuns)
        .set({
          triggerRunId: handle.id,
          updatedAt: new Date(),
        })
        .where(eq(schema.securityAuditRuns.id, run.id))
        .returning()

      capturePostHogEvent(
        POSTHOG_EVENTS.STORY_RUN_MANUAL, // TODO: Create SECURITY_AUDIT_RUN_MANUAL event
        {
          audit_id: audit.id,
          audit_name: audit.name,
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

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const run = await ctx.db.query.securityAuditRuns.findFirst({
        where: (runs, { eq }) => eq(runs.id, input.id),
      })

      if (!run) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Security audit run not found',
        })
      }

      // Verify audit belongs to user
      const audit = await ctx.db.query.securityAudits.findFirst({
        where: (audits, { and, eq }) =>
          and(eq(audits.id, run.auditId), eq(audits.userId, ctx.user.id)),
      })

      if (!audit) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Security audit run not found',
        })
      }

      return run
    }),

  list: protectedProcedure
    .input(z.object({ auditId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify audit belongs to user
      const audit = await ctx.db.query.securityAudits.findFirst({
        where: (audits, { and, eq }) =>
          and(eq(audits.id, input.auditId), eq(audits.userId, ctx.user.id)),
      })

      if (!audit) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Security audit not found',
        })
      }

      const runs = await ctx.db
        .select()
        .from(schema.securityAuditRuns)
        .where(eq(schema.securityAuditRuns.auditId, input.auditId))
        .orderBy(desc(schema.securityAuditRuns.createdAt))

      return runs
    }),
})
