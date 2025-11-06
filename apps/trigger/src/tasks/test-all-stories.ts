import { task, logger } from '@trigger.dev/sdk'
import { setupDb } from '@app/db'
import { parseEnv } from '../helpers/env'

export const testAllStoriesTask = task({
  id: 'test-all-stories',
  run: async (
    payload: {
      repoId: string
      branchName: string
    },
    { ctx: _ctx },
  ) => {
    logger.info('Fetching stories for testing', {
      repoId: payload.repoId,
      branchName: payload.branchName,
    })

    const env = parseEnv()
    const db = setupDb(env.DATABASE_URL)

    const stories = await db
      .selectFrom('stories')
      .selectAll()
      .where('repoId', '=', payload.repoId)
      .where('branchName', '=', payload.branchName)
      .execute()

    if (stories.length === 0) {
      logger.warn('No stories found', {
        repoId: payload.repoId,
        branchName: payload.branchName,
      })
      return []
    }

    logger.info('Testing stories in parallel', {
      storyCount: stories.length,
    })

    // Inline execution placeholder. Actual task chaining can be added later
    return []
  },
})
