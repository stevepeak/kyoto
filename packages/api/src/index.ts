import { userRouter } from './routers/user'
import { router } from './trpc'
import { orgRouter } from './routers/org'
import { repoRouter } from './routers/repo'
import { storyRouter } from './routers/story'
import { runRouter } from './routers/run'
import { feedbackRouter } from './routers/feedback'

export type { Context, Session, SessionUser } from './context'

// TODO maybe move these into a @app/utils package?
export { getUser } from './helpers/users'
export {
  findOwnerForUser,
  findRepoForUser,
  findStoryForUser,
  requireRepoForUser,
} from './helpers/memberships'

export const appRouter = router({
  user: userRouter,
  org: orgRouter,
  repo: repoRouter,
  story: storyRouter,
  run: runRouter,
  feedback: feedbackRouter,
})

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter
