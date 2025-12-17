import { getConfig } from '@app/config'
import { createDb, eq, schema } from '@app/db'
import { logger, schedules, tasks } from '@trigger.dev/sdk'

export const agentScheduledTask = schedules.task({
  id: 'agent-scheduled',
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
    const story = await db.query.stories.findFirst({
      where: eq(schema.stories.id, storyId),
    })

    if (!story) {
      logger.error('Story not found', { storyId })
      throw new Error(`Story not found: ${storyId}`)
    }

    // Create a pending run record
    const [run] = await db
      .insert(schema.storyRuns)
      .values({
        storyId: story.id,
        userId: story.userId,
        status: 'pending',
      })
      .returning()

    logger.log('Created run record', { runId: run.id, storyId: story.id })

    // Trigger the appropriate task based on test type
    const taskId = story.testType === 'vm' ? 'vm-agent' : 'browser-agent'

    const handle = await tasks.trigger(taskId, {
      runId: run.id,
      storyId: story.id,
      instructions: story.instructions,
    })

    await db
      .update(schema.storyRuns)
      .set({
        triggerRunId: handle.id,
        updatedAt: new Date(),
      })
      .where(eq(schema.storyRuns.id, run.id))

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
