import { z } from 'zod'

import { protectedProcedure, router } from '../trpc'

export const actionRouter = router({
  listByRepo: protectedProcedure
    .input(z.object({ orgSlug: z.string(), repoName: z.string() }))
    .query(() => {
      const actions = [
        {
          id: 'a1',
          runId: '101',
          status: 'success' as const,
          createdAt: new Date().toISOString(),
          commitSha: 'abc1234',
        },
        {
          id: 'a2',
          runId: '102',
          status: 'running' as const,
          createdAt: new Date().toISOString(),
          commitSha: 'def5678',
        },
      ]
      return { actions }
    }),
})
