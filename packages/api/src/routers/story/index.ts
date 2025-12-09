import { router } from '../../trpc'
import { bulkArchive } from './bulk-archive'
import { bulkPause } from './bulk-pause'
import { create } from './create'
import { decompose } from './decompose'
import { generate } from './generate'
import { get } from './get'
import { listByRepo } from './list-by-repo'
import { test } from './test'
import { toggleState } from './toggle-state'
import { update } from './update'

export const storyRouter = router({
  listByRepo,
  get,
  create,
  update,
  toggleState,
  bulkPause,
  bulkArchive,
  test,
  decompose,
  generate,
})
