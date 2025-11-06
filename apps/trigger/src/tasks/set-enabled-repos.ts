import { task, logger } from '@trigger.dev/sdk'
import { setupDb } from '@app/db'
import { parseEnv } from '../helpers/env'
import { setEnabledReposStep } from '../steps/set-enabled-repos'

export const setEnabledReposTask = task({
  id: 'set-enabled-repos',
  run: async (
    payload: {
      ownerLogin: string
      repoNames: string[]
    },
    { ctx: _ctx },
  ) => {
    logger.info('Setting enabled repos', {
      ownerLogin: payload.ownerLogin,
      repoCount: payload.repoNames.length,
    })

    const env = parseEnv()
    const db = setupDb(env.DATABASE_URL)

    const result = await setEnabledReposStep({
      db,
      ownerLogin: payload.ownerLogin,
      repoNames: payload.repoNames,
    })

    logger.info('Enabled repos updated', {
      ownerLogin: payload.ownerLogin,
      updated: result.updated,
    })

    return result
  },
})
