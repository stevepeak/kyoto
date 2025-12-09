import { desc, eq, type Run, schema } from '@app/db'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { findRepoForUser } from '../../helpers/memberships'
import { protectedProcedure } from '../../trpc'

export const listByRepo = protectedProcedure
  .input(z.object({ orgName: z.string(), repoName: z.string() }))
  .query(async ({ ctx, input }) => {
    const userId = ctx.user?.id

    if (!userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }

    const repo = await findRepoForUser(ctx.db, {
      orgName: input.orgName,
      repoName: input.repoName,
      userId,
    })

    if (!repo) {
      return { runs: [] }
    }

    // Query runs for this repo
    const dbRuns = await ctx.db
      .select()
      .from(schema.runs)
      .where(eq(schema.runs.repoId, repo.id))
      .orderBy(desc(schema.runs.createdAt))

    // Map database runs to frontend format
    // Map status: 'pass' -> 'success', 'fail' -> 'failed', 'skipped' -> 'skipped', 'running' -> 'running'
    const statusMap: Record<
      string,
      'queued' | 'running' | 'success' | 'failed' | 'skipped' | 'error'
    > = {
      pass: 'success',
      fail: 'failed',
      skipped: 'skipped',
      running: 'running',
      error: 'error',
    }

    const runs = dbRuns.map((run: Run) => {
      const createdAt = run.createdAt
      const updatedAt = run.updatedAt
      // Calculate duration in milliseconds
      const durationMs = updatedAt.getTime() - createdAt.getTime()

      return {
        id: run.id,
        runId: String(run.number),
        status: statusMap[run.status] ?? 'queued',

        createdAt: createdAt.toISOString(),

        updatedAt: updatedAt.toISOString(),
        durationMs,
        commitSha: run.commitSha ?? null,
        commitMessage: run.commitMessage ?? null,
        branchName: run.branchName,
      }
    })

    return { runs }
  })
