import { z } from 'zod'

import { protectedProcedure, router } from '../trpc'

export const repoRouter = router({
  listByOrg: protectedProcedure
    .input(z.object({ orgSlug: z.string() }))
    .query(({ input: _input }) => {
      // Hardwired data for MVP
      const repos = [
        { id: 'repo-1', name: 'app', defaultBranch: 'main', updatedAt: new Date().toISOString() },
        { id: 'repo-2', name: 'api', defaultBranch: 'main', updatedAt: new Date().toISOString() },
      ]
      return { repos }
    }),
})


