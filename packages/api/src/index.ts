import { userRouter } from './routers/user.js'
import { router } from './trpc.js'
import { orgRouter } from './routers/org.js'
import { repoRouter } from './routers/repo.js'
import { storyRouter } from './routers/story.js'
import { runRouter } from './routers/run.js'
import { feedbackRouter } from './routers/feedback.js'

export type { Context, Session, SessionUser } from './context.js'

// TODO maybe move these into a @app/utils package?
export { getUser } from './helpers/users.js'
export {
  findOwnerForUser,
  findRepoForUser,
  findStoryForUser,
  requireRepoForUser,
} from './helpers/memberships.js'

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
