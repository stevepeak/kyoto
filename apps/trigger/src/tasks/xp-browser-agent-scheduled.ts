import { getConfig } from '@app/config'
import { createDb, eq, schema } from '@app/db'
import { logger, schedules, tasks } from '@trigger.dev/sdk'

export const xpBrowserAgentScheduledTask = schedules.task({
  id: 'xp-browser-agent-scheduled',
  run: async (payload) => {
    const storyId = payload.externalId

    if (!storyId) {
      throw new Error('externalId (storyId) is required')
    }

    logger.log('Scheduled browser agent task triggered', {
      storyId,
      scheduleId: payload.scheduleId,
      timestamp: payload.timestamp,
    })

    const config = getConfig()
    const db = createDb({ databaseUrl: config.DATABASE_URL })

    // Fetch the story
    const story = await db.query.xpStories.findFirst({
      where: eq(schema.xpStories.id, storyId),
    })

    if (!story) {
      logger.error('Story not found', { storyId })
      throw new Error(`Story not found: ${storyId}`)
    }

    // Create a pending run record
    const [run] = await db
      .insert(schema.xpStoriesRuns)
      .values({
        storyId: story.id,
        userId: story.userId,
        status: 'pending',
      })
      .returning()

    logger.log('Created run record', { runId: run.id, storyId: story.id })

    // Trigger the existing browser agent task
    const handle = await tasks.trigger('xp-browser-agent', {
      runId: run.id,
      storyId: story.id,
      instructions: story.instructions,
    })

    logger.log('Triggered browser agent task', {
      runId: run.id,
      triggerId: handle.id,
    })

    return {
      runId: run.id,
      storyId: story.id,
      triggerId: handle.id,
    }
  },
})
