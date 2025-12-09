import { tasks } from '@trigger.dev/sdk'
import { z } from 'zod'

import { protectedProcedure } from '../../trpc'

export const syncInstallation = protectedProcedure
  .input(
    z.object({
      installationId: z.number(),
    }),
  )
  .mutation(async ({ input }) => {
    const { installationId } = input

    const handle = await tasks.trigger(
      'sync-github-installation',
      {
        installationId,
      },
      {
        idempotencyKey: `sync-${installationId}`,
        idempotencyKeyTTL: '10m',
        priority: 10,
      },
    )

    return {
      success: true,
      triggerHandle: {
        publicAccessToken: handle.publicAccessToken,
        id: handle.id,
      },
      installationId,
    }
  })
