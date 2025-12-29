import { count, desc, eq, schema } from '@app/db'
import { capturePostHogEvent, POSTHOG_EVENTS } from '@app/posthog'
import { validateCronMinimumInterval } from '@app/utils'
import { configure, schedules } from '@trigger.dev/sdk'
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

export const securityAuditsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const audits = await ctx.db
      .select()
      .from(schema.securityAudits)
      .where(eq(schema.securityAudits.userId, ctx.user.id))
      .orderBy(desc(schema.securityAudits.updatedAt))

    return audits
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const audit = await ctx.db.query.securityAudits.findFirst({
        where: (audits, { and, eq }) =>
          and(eq(audits.id, input.id), eq(audits.userId, ctx.user.id)),
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
        .where(eq(schema.securityAuditRuns.auditId, audit.id))
        .orderBy(desc(schema.securityAuditRuns.createdAt))
        .limit(20)

      // Find active run with trigger handle for reconnection
      const activeRun = runs.find(
        (run) =>
          (run.status === 'pending' || run.status === 'running') &&
          run.triggerRunId,
      )

      return {
        audit,
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
        repoId: z.string().uuid(),
        targetUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check audit limit based on user plan (similar to stories)
      if (ctx.user.plan === 'free') {
        const [auditCountResult] = await ctx.db
          .select({ count: count() })
          .from(schema.securityAudits)
          .where(eq(schema.securityAudits.userId, ctx.user.id))

        const auditCount = auditCountResult?.count ?? 0

        if (auditCount >= 1) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message:
              'Free plan is limited to 1 security audit site. Upgrade to create unlimited sites.',
          })
        }
      }

      const [audit] = await ctx.db
        .insert(schema.securityAudits)
        .values({
          userId: ctx.user.id,
          repoId: input.repoId,
          name: input.name,
          targetUrl: input.targetUrl ?? null,
        })
        .returning()

      capturePostHogEvent(
        POSTHOG_EVENTS.SECURITY_AUDIT_CREATED,
        {
          audit_id: audit.id,
          audit_name: audit.name,
        },
        ctx.user.id,
      )

      return audit
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        targetUrl: z.string().url().nullable().optional(),
        scheduleText: z.string().nullable().optional(),
        cronSchedule: z.string().nullable().optional(),
        enabled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.securityAudits.findFirst({
        where: (audits, { and, eq }) =>
          and(eq(audits.id, input.id), eq(audits.userId, ctx.user.id)),
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Security audit not found',
        })
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
            task: 'security-audit-scheduled',
            cron: input.cronSchedule,
            timezone: ctx.user.timeZone ?? 'UTC',
            externalId: input.id,
            deduplicationKey: `security-audit-${input.id}`,
          })
          triggerScheduleId = createdSchedule.id
        } else if (existing.triggerScheduleId) {
          // Delete existing schedule
          await schedules.del(existing.triggerScheduleId)
          triggerScheduleId = null
        }
      }

      const [updated] = await ctx.db
        .update(schema.securityAudits)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.targetUrl !== undefined
            ? { targetUrl: input.targetUrl }
            : {}),
          ...(input.scheduleText !== undefined
            ? { scheduleText: input.scheduleText }
            : {}),
          ...(input.cronSchedule !== undefined
            ? { cronSchedule: input.cronSchedule }
            : {}),
          ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
          triggerScheduleId,
          updatedAt: new Date(),
        })
        .where(eq(schema.securityAudits.id, input.id))
        .returning()

      capturePostHogEvent(
        POSTHOG_EVENTS.SECURITY_AUDIT_EDITED,
        {
          audit_id: updated.id,
          audit_name: updated.name,
        },
        ctx.user.id,
      )

      return updated
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.securityAudits.findFirst({
        where: (audits, { and, eq }) =>
          and(eq(audits.id, input.id), eq(audits.userId, ctx.user.id)),
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Security audit not found',
        })
      }

      // Delete schedule if exists
      if (existing.triggerScheduleId) {
        ensureTriggerConfigured(ctx.env.TRIGGER_SECRET_KEY)
        await schedules.del(existing.triggerScheduleId)
      }

      await ctx.db
        .delete(schema.securityAudits)
        .where(eq(schema.securityAudits.id, input.id))

      capturePostHogEvent(
        POSTHOG_EVENTS.SECURITY_AUDIT_DELETED,
        {
          audit_id: input.id,
        },
        ctx.user.id,
      )

      return { success: true }
    }),
})
