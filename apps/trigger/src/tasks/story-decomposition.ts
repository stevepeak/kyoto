import { task, logger } from '@trigger.dev/sdk'

import { setupDb } from '@app/db'
import { parseEnv, runStoryDecompositionAgent } from '@app/agents'
import { createDaytonaSandbox } from '../helpers/daytona'
import { getTelemetryTracer } from '@/telemetry'

interface StoryDecompositionPayload {
  /** A raw user story written in Gherkin or natural language */
  story: {
    id?: string
    text: string
  }
  /** Identifier for the repository in {owner}/{repo} format */
  repo: {
    id: string
    slug: string
  }
}

export const storyDecompositionTask = task({
  id: 'story-decomposition',
  run: async ({ story, repo }: StoryDecompositionPayload) => {
    const env = parseEnv()
    const db = setupDb(env.DATABASE_URL)

    // Create the sandbox and clone the repository
    const sandbox = await createDaytonaSandbox({ repoId: repo.id })

    try {
      // Run the story decomposition agent
      const decompositionResult = await runStoryDecompositionAgent({
        story,
        repo,
        options: {
          daytonaSandboxId: sandbox.id,
          telemetryTracer: getTelemetryTracer(),
        },
      })

      logger.info('Story decomposition completed', {
        slug: repo.slug,
        stepCount: decompositionResult.stepCount,
        toolCallCount: decompositionResult.toolCallCount,
        stepsCount: decompositionResult.steps.length,
      })

      // Save decomposition results to the story record if story.id exists
      if (story.id) {
        await db
          .updateTable('stories')
          .set({
            decomposition: JSON.stringify(decompositionResult.steps),
          })
          .where('id', '=', story.id)
          .execute()
      }

      // Return the structured output
      return {
        steps: decompositionResult.steps,
      }
    } catch (error) {
      logger.error('Story decomposition failed', {
        story,
        repo,
        error,
      })
      throw error
    } finally {
      await sandbox.delete()
    }
  },
})
