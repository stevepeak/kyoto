import { and, eq, isNotNull, schema } from '@app/db'
import { tasks } from '@trigger.dev/sdk'
import { TRPCError } from '@trpc/server'

import { protectedProcedure } from '../../trpc'

export const refreshInstallations = protectedProcedure.mutation(
  async ({ ctx }) => {
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
      .map((row) => {
        // installationId is guaranteed to be non-null due to isNotNull filter above
        const parsed = Number.parseInt(String(row.installationId), 10)

        if (!Number.isFinite(parsed)) {
          // eslint-disable-next-line no-console
          console.warn(
            `Skipping invalid installation id for owner ${row.login}: ${row.installationId}`,
          )
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
        triggered: 0,
        total: 0,
        failed: 0,
      }
    }

    const results = await Promise.allSettled(
      installations.map((installation) =>
        tasks.trigger(
          'sync-github-installation',
          {
            installationId: installation.installationId,
          },
          {
            // idempotencyKey: `sync-${installation.installationId}`,
            // idempotencyKeyTTL: '1m',
            priority: 10,
          },
        ),
      ),
    )

    const failed = results.filter(
      (result) => result.status === 'rejected',
    ).length

    // Get the first successful trigger handle for tracking
    const firstSuccess = results.find((result) => result.status === 'fulfilled')

    return {
      triggered: installations.length - failed,
      total: installations.length,
      failed,
      triggerHandle: firstSuccess?.value
        ? {
            publicAccessToken: firstSuccess.value.publicAccessToken,
            id: firstSuccess.value.id,
          }
        : undefined,
    }
  },
)
