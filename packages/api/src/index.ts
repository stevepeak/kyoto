import { userRouter } from './routers/user'
import { router } from './trpc'
import { orgRouter } from './routers/org'
import { repoRouter } from './routers/repo'
import { branchRouter } from './routers/branch'
import { storyRouter } from './routers/story'
import { runRouter } from './routers/run'

export type { Context, Env, Session, SessionUser } from './context'

export { getUser } from './actions/users/getters'
export {
  githubAppCallbackQuerySchema,
  syncGithubInstallation,
  setEnabledRepos,
} from './actions/github/installations'
export { analyzeRepository } from './actions/repo/analyze'
export type { AnalyzeRepositoryResult } from './actions/repo/analyze'

export const appRouter = router({
  user: userRouter,
  org: orgRouter,
  repo: repoRouter,
  branch: branchRouter,
  story: storyRouter,
  run: runRouter,
})

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter
