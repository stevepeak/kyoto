import { z } from 'zod'

import { protectedProcedure, router } from '../trpc'

export const branchRouter = router({
  listByRepo: protectedProcedure
    .input(z.object({ orgSlug: z.string(), repoName: z.string() }))
    .query(({ input: _input }) => {
      const branches = [
        {
          name: 'main',
          headSha: 'abcdef1',
          updatedAt: new Date().toISOString(),
        },
        {
          name: 'feature/ai-gherkin',
          headSha: 'abcdef2',
          updatedAt: new Date().toISOString(),
        },
      ]
      return { branches }
    }),
})
