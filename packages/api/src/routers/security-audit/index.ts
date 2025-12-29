import { router } from '../../trpc'
import { securityAuditsRouter } from './audits'
import { securityAuditRunsRouter } from './runs'

export const securityAuditRouter = router({
  audits: securityAuditsRouter,
  runs: securityAuditRunsRouter,
})
