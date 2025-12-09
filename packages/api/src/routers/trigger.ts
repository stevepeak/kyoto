import { and, eq, isNotNull, schema } from '@app/db'
import { configure, tasks } from '@trigger.dev/sdk'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { protectedProcedure, router } from '../trpc'

let isTriggerConfigured = false

function ensureTriggerConfigured(secretKey: string) {
  if (!isTriggerConfigured) {
    configure({
      secretKey,
    })
    isTriggerConfigured = true
  }
}

export const triggerRouter = router({
  helloWorld: protectedProcedure
    .input(z.object({ name: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      ensureTriggerConfigured(ctx.env.TRIGGER_SECRET_KEY)

      const handle = await tasks.trigger('hello-world', { name: input.name })

      return {
        success: true,
        triggerHandle: {
          id: handle.id,
          publicAccessToken: handle.publicAccessToken,
        },
      }
    }),

  syncInstallations: protectedProcedure.mutation(async ({ ctx }) => {
    ensureTriggerConfigured(ctx.env.TRIGGER_SECRET_KEY)

    const userId = ctx.user?.id

    if (!userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }

    const installationRows = await ctx.db
      .select({
        installationId: schema.owners.installationId,
        login: schema.owners.login,
      })
      .from(schema.owners)
      .innerJoin(
        schema.ownerMemberships,
        eq(schema.ownerMemberships.ownerId, schema.owners.id),
      )
      .where(
        and(
          isNotNull(schema.owners.installationId),
          eq(schema.ownerMemberships.userId, userId),
        ),
      )

    const installations = installationRows
      .map((row): { installationId: number; login: string } | null => {
        if (row.installationId === null) {
          return null
        }

        const parsed = Number.parseInt(String(row.installationId), 10)

        if (!Number.isFinite(parsed)) {
          return null
        }

        return {
          installationId: parsed,
          login: row.login,
        }
      })
      .filter(
        (value): value is { installationId: number; login: string } =>
          value !== null,
      )

    if (installations.length === 0) {
      return {
        success: true,
        triggered: 0,
        total: 0,
        triggerHandle: null,
      }
    }

    const results = await Promise.allSettled(
      installations.map(
        (installation: { installationId: number; login: string }) =>
          tasks.trigger('sync-github-installation', {
            installationId: installation.installationId,
          }),
      ),
    )

    const failed = results.filter(
      (result: PromiseSettledResult<unknown>) => result.status === 'rejected',
    ).length

    const firstSuccess = results.find(
      (result: PromiseSettledResult<unknown>) => result.status === 'fulfilled',
    )

    return {
      success: true,
      triggered: installations.length - failed,
      total: installations.length,
      triggerHandle:
        firstSuccess && firstSuccess.status === 'fulfilled'
          ? {
              id: firstSuccess.value.id,
              publicAccessToken: firstSuccess.value.publicAccessToken,
            }
          : null,
    }
  }),
})
