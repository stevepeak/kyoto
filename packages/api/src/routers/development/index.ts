import { Daytona } from '@daytonaio/sdk'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { protectedProcedure, router } from '../../trpc'

export const developmentRouter = router({
  createSandbox: protectedProcedure.mutation(async ({ ctx }) => {
    const daytona = new Daytona({ apiKey: ctx.env.DAYTONA_API_KEY })

    try {
      const sandbox = await daytona.create({
        language: 'typescript',
        autoStopInterval: 30,
      })

      return {
        id: sandbox.id,
        success: true,
      }
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message:
          error instanceof Error ? error.message : 'Failed to create sandbox',
      })
    }
  }),

  getSandboxSsh: protectedProcedure
    .input(z.object({ sandboxId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const daytona = new Daytona({ apiKey: ctx.env.DAYTONA_API_KEY })

      try {
        const sandbox = await daytona.get(input.sandboxId)
        const sshAccess = await sandbox.createSshAccess(60) // 60 minutes expiry

        return {
          token: sshAccess.token,
          sshCommand: `ssh ${sshAccess.token}@ssh.app.daytona.io`,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message:
            error instanceof Error ? error.message : 'Failed to get SSH access',
        })
      }
    }),

  destroySandbox: protectedProcedure
    .input(z.object({ sandboxId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const daytona = new Daytona({ apiKey: ctx.env.DAYTONA_API_KEY })

      try {
        const sandbox = await daytona.get(input.sandboxId)
        await daytona.delete(sandbox)

        return {
          success: true,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to destroy sandbox',
        })
      }
    }),
})
