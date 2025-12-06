import { task, logger } from '@trigger.dev/sdk'

import { setupDb, sql } from '@app/db'
import { agents } from '@app/agents'
import { getConfig } from '@app/config'
import { createDaytonaSandbox } from '../helpers/daytona'
import { getTelemetryTracer } from '@/telemetry'
import type { DecompositionAgentResult } from '@app/agents'
import { invalidateCacheForStory } from '@app/cache'
import * as Sentry from '@sentry/node'

interface DecompositionPayload {
  /** A raw user story written in Gherkin or natural language */
  story: {
    id?: string
    text: string
    /** Story title - empty string if needs to be generated */
    title?: string
  }
  /** Identifier for the repository in {owner}/{repo} format */
  repo: {
    id: string
    slug: string
  }
}

export const storyDecompositionTask = task({
  id: 'story-decomposition',
  run: async ({
    story,
    repo,
  }: DecompositionPayload): Promise<DecompositionAgentResult> => {
    const env = getConfig()
    const db = setupDb(env.DATABASE_URL)

    Sentry.setUser({ name: repo.slug })

    // Create the sandbox and clone the repository
    const sandbox = await createDaytonaSandbox({ repoId: repo.id })

    try {
      // Run the story decomposition agent
      const decompositionResult: DecompositionAgentResult =
        await agents.decomposition.run({
          story,
          repo,
          options: {
            daytonaSandboxId: sandbox.id,
            telemetryTracer: getTelemetryTracer(),
          },
        })

      // Save decomposition results to the story record if story.id exists
      if (story.id) {
        // Get existing decomposition to check if it changed
        const existingStory = await db
          .selectFrom('stories')
          .select('decomposition')
          .where('id', '=', story.id)
          .executeTakeFirst()

        // Extract just the decomposition steps (without title and embedding) for comparison
        const { title, embedding, ...decompositionSteps } = decompositionResult
        const newDecomposition = JSON.stringify(decompositionSteps)
        const decompositionChanged =
          !existingStory ||
          existingStory.decomposition === null ||
          JSON.stringify(existingStory.decomposition) !== newDecomposition

        // Format embedding array as pgvector string format: '[1,2,3]'
        const embeddingVector = `[${embedding.join(',')}]`

        await db
          .updateTable('stories')
          .set({
            name: title,
            decomposition: newDecomposition,
            embedding: sql`${embeddingVector}::vector`,
          })
          .where('id', '=', story.id)
          .execute()

        // Invalidate cache if decomposition changed
        if (decompositionChanged) {
          // TODO we may not want to delete cache... not sure.
          await invalidateCacheForStory({
            db,
            storyId: story.id,
          })

          logger.info('Invalidated cache due to decomposition change', {
            storyId: story.id,
          })
        }
      }

      // Return the structured output
      return decompositionResult
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
