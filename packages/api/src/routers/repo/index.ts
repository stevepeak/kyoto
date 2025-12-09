import { router } from '../../trpc'
import { enableRepo } from './enable-repo'
import { getBySlug } from './get-by-slug'
import { listByOrg } from './list-by-org'

export const repoRouter = router({
  listByOrg,
  getBySlug,
  enableRepo,
})
