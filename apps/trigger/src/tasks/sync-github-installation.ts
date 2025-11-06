import { task, logger } from '@trigger.dev/sdk'
import { setupDb } from '@app/db'
import { parseEnv } from '../helpers/env'
import { syncGithubInstallationStep } from '../steps/sync-github-installation'

export const syncGithubInstallationTask = task({
  id: 'sync-github-installation',
  run: async (
    payload: {
      installationId: number
    },
    { ctx: _ctx },
  ) => {
    logger.info('Syncing GitHub installation', {
      installationId: payload.installationId,
    })

    const env = parseEnv()
    const db = setupDb(env.DATABASE_URL)

    const result = await syncGithubInstallationStep({
      db,
      installationId: payload.installationId,
    })

    logger.info('GitHub installation synced', {
      installationId: payload.installationId,
      ownerId: result.ownerId,
      ownerLogin: result.ownerLogin,
      repoCount: result.repoCount,
    })

    return result
  },
})
