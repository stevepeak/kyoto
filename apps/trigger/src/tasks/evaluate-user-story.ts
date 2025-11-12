import { task, logger } from '@trigger.dev/sdk'

import { setupDb } from '@app/db'
import { parseEnv, runStoryAnalysisAgent } from '@app/agents'

interface EvaluateUserStoryPayload {
  /** A raw user story written in Gherkin or natural language */
  story: string
  /** Identifier for the repository in {owner}/{repo} format */
  slug: string
  /** The Daytona Sandbox ID for repository access */
  daytonaSandboxId: string
}

export const evaluateUserStoryTask = task({
  id: 'evaluate-user-story',
  run: async (payload: EvaluateUserStoryPayload) => {
    const env = parseEnv()
    const db = setupDb(env.DATABASE_URL)

    // Parse slug into owner and repo name
    const slugParts = payload.slug.split('/')
    if (slugParts.length !== 2) {
      throw new Error(
        `Invalid slug format: "${payload.slug}". Expected format: "owner/repo"`,
      )
    }

    const [ownerLogin, repoName] = slugParts

    // Retrieve the repository record (read-only access)
    const repoRecord = await db
      .selectFrom('repos')
      .innerJoin('owners', 'repos.ownerId', 'owners.id')
      .select([
        'repos.id as repoId',
        'repos.name as repoName',
      ])
      .where('owners.login', '=', ownerLogin)
      .where('repos.name', '=', repoName)
      .executeTakeFirst()

    if (!repoRecord) {
      throw new Error(
        `Repository not found: ${payload.slug}. Make sure the repository exists in the database.`,
      )
    }

    logger.info('Starting story analysis', {
      story: payload.story,
      slug: payload.slug,
      repoId: repoRecord.repoId,
      repoName: repoRecord.repoName,
    })

    try {
      // Run the story analysis agent
      const analysisResult = await runStoryAnalysisAgent({
        story: payload.story,
        repoId: repoRecord.repoId,
        repoName: repoRecord.repoName,
        daytonaSandboxId: payload.daytonaSandboxId,
        maxSteps: 20,
      })

      logger.info('Story analysis completed', {
        slug: payload.slug,
        stepCount: analysisResult.stepCount,
        toolCallCount: analysisResult.toolCallCount,
        stepsCount: analysisResult.steps.length,
      })

      // Return the structured output (no side effects)
      return {
        steps: analysisResult.steps,
      }
    } catch (error) {
      logger.error('Story analysis failed', {
        story: payload.story,
        slug: payload.slug,
        error,
      })
      throw error
    }
  },
})
