import { TRPCError } from '@trpc/server'
import { tasks } from '@trigger.dev/sdk'
import { eq, and, isNotNull, count, asc } from 'drizzle-orm'

import { router, protectedProcedure } from '../trpc'
import {
  owners,
  ownerMemberships,
  repoMemberships,
  repos,
} from '@app/db/schema'

export const orgRouter = router({
  getDefault: protectedProcedure.query(() => {
    return {
      org: {
        id: 'demo-org',
        slug: 'demo-org',
        name: 'Demo Org',
      },
    }
  }),
  listInstalled: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user?.id

    if (!userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }

    const ownersList = await ctx.db
      .select({
        ownerId: owners.id,
        slug: owners.login,
        accountName: owners.name,
      })
      .from(owners)
      .innerJoin(ownerMemberships, eq(ownerMemberships.ownerId, owners.id))
      .where(
        and(
          isNotNull(owners.installationId),
          eq(ownerMemberships.userId, userId),
        ),
      )
      .orderBy(asc(owners.login))

    const ownerIds = ownersList.map((owner) => owner.ownerId)

    const repoCounts =
      ownerIds.length === 0
        ? []
        : await ctx.db
            .select({
              ownerId: repos.ownerId,
              count: count(repoMemberships.id),
            })
            .from(repoMemberships)
            .innerJoin(repos, eq(repos.id, repoMemberships.repoId))
            .where(
              and(eq(repoMemberships.userId, userId), eq(repos.enabled, true)),
            )
            .groupBy(repos.ownerId)

    const repoCountByOwner = new Map(
      repoCounts.map((entry) => [entry.ownerId, Number(entry.count ?? 0)]),
    )

    return {
      orgs: ownersList.map((owner) => ({
        slug: owner.slug,
        name: owner.accountName ?? owner.slug,
        accountName: owner.accountName ?? null,
        repoCount: repoCountByOwner.get(owner.ownerId) ?? 0,
      })),
    }
  }),

  refreshInstallations: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user?.id

    if (!userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }

    const installationRows = await ctx.db
      .select({
        installationId: owners.installationId,
        login: owners.login,
      })
      .from(owners)
      .innerJoin(ownerMemberships, eq(ownerMemberships.ownerId, owners.id))
      .where(
        and(
          isNotNull(owners.installationId),
          eq(ownerMemberships.userId, userId),
        ),
      )

    const installations = installationRows
      .map((row) => {
        if (row.installationId === null) {
          return null
        }

        const parsed = Number.parseInt(String(row.installationId), 10)

        if (!Number.isFinite(parsed)) {
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
            idempotencyKey: `sync-${installation.installationId}`,
            idempotencyKeyTTL: '10m',
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
  }),
})
