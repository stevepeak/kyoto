import { router, protectedProcedure } from '../trpc'

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
})
