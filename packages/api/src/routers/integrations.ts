import { desc, eq, schema } from '@app/db'
import { createSampleWebhookPayload, webhookConfigSchema } from '@app/schemas'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { protectedProcedure, router } from '../trpc'

export const integrationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const integrations = await ctx.db
      .select()
      .from(schema.xpIntegrations)
      .where(eq(schema.xpIntegrations.userId, ctx.user.id))
      .orderBy(desc(schema.xpIntegrations.createdAt))

    return integrations
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const integration = await ctx.db.query.xpIntegrations.findFirst({
        where: (integrations, { and, eq }) =>
          and(
            eq(integrations.id, input.id),
            eq(integrations.userId, ctx.user.id),
          ),
      })

      if (!integration) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Integration not found',
        })
      }

      return integration
    }),

  create: protectedProcedure
    .input(
      z.object({
        type: z.enum(['webhook']),
        name: z.string().min(1).max(255),
        config: webhookConfigSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [integration] = await ctx.db
        .insert(schema.xpIntegrations)
        .values({
          userId: ctx.user.id,
          type: input.type,
          name: input.name,
          config: input.config,
        })
        .returning()

      return integration
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        config: webhookConfigSchema.optional(),
        enabled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.xpIntegrations.findFirst({
        where: (integrations, { and, eq }) =>
          and(
            eq(integrations.id, input.id),
            eq(integrations.userId, ctx.user.id),
          ),
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Integration not found',
        })
      }

      const [updated] = await ctx.db
        .update(schema.xpIntegrations)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.config !== undefined ? { config: input.config } : {}),
          ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
          updatedAt: new Date(),
        })
        .where(eq(schema.xpIntegrations.id, input.id))
        .returning()

      return updated
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.xpIntegrations.findFirst({
        where: (integrations, { and, eq }) =>
          and(
            eq(integrations.id, input.id),
            eq(integrations.userId, ctx.user.id),
          ),
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Integration not found',
        })
      }

      await ctx.db
        .delete(schema.xpIntegrations)
        .where(eq(schema.xpIntegrations.id, input.id))

      return { success: true }
    }),

  test: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const integration = await ctx.db.query.xpIntegrations.findFirst({
        where: (integrations, { and, eq }) =>
          and(
            eq(integrations.id, input.id),
            eq(integrations.userId, ctx.user.id),
          ),
      })

      if (!integration) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Integration not found',
        })
      }

      if (integration.type !== 'webhook') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only webhook integrations can be tested',
        })
      }

      const config = webhookConfigSchema.parse(integration.config)
      const samplePayload = createSampleWebhookPayload()

      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: JSON.stringify(samplePayload),
      })

      if (!response.ok) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Webhook test failed with status ${response.status}: ${response.statusText}`,
        })
      }

      return { success: true, status: response.status }
    }),

  getSamplePayload: protectedProcedure.query(() => {
    return createSampleWebhookPayload()
  }),
})
