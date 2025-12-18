import { router } from '../../../trpc'
import { runsRouter } from './runs'
import { storiesRouter } from './stories'

export const browserAgentsRouter = router({
  ...storiesRouter._def.procedures,
  ...runsRouter._def.procedures,
})
