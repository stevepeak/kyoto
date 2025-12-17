import { browserAgentsRouter } from './routers/experiments/browser-agents'
import { developmentRouter } from './routers/development'
import { feedbackRouter } from './routers/feedback'
import { integrationsRouter } from './routers/integrations'
import { orgRouter } from './routers/org'
import { repoRouter } from './routers/repo'
import { triggerRouter } from './routers/trigger'
import { userRouter } from './routers/user'
import { router } from './trpc'

export type { Context, Session, SessionUser } from './context'

// TODO maybe move these into a @app/utils package?
export { getUser, getUserGithubLogin } from './helpers/users'
export { ensureOpenRouterApiKey } from './helpers/openrouter'
export {
  findOwnerForUser,
  findRepoForUser,
  requireRepoForUser,
} from './helpers/memberships'

export const appRouter = router({
  user: userRouter,
  org: orgRouter,
  repo: repoRouter,
  feedback: feedbackRouter,
  trigger: triggerRouter,
  integrations: integrationsRouter,
  browserAgents: browserAgentsRouter,
  development: developmentRouter,
})

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter
