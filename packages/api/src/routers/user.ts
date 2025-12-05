import { getUser, getUserGithubLogin } from '../helpers/users'
import { protectedProcedure, router } from '../trpc'

export const userRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id

    const user = await getUser({
      db: ctx.db,
      userId,
    })

    const githubLogin = await getUserGithubLogin({
      db: ctx.db,
      userId,
    })

    return {
      ...user,
      githubLogin,
    }
  }),
})
