import { router } from '../../trpc'
import { listInstalled } from './list-installed'
import { refreshInstallations } from './refresh-installations'
import { syncInstallation } from './sync-installation'

export const orgRouter = router({
  listInstalled,
  refreshInstallations,
  syncInstallation,
})
