import { router } from '../../trpc'
import { create } from './create'
import { getByRunId } from './get-by-run-id'
import { listByRepo } from './list-by-repo'

export const runRouter = router({
  listByRepo,
  getByRunId,
  create,
})
