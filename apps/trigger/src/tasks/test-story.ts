import { agents } from '@app/agents'
import { getCachedEvidence, validateCacheEntry } from '@app/cache'
import { getConfig } from '@app/config'
import { getDaytonaSandbox } from '@app/daytona'
import { and, createDb, desc, eq, schema } from '@app/db'
import { type EvaluationOutput } from '@app/schemas'
import * as Sentry from '@sentry/node'
import { logger, task } from '@trigger.dev/sdk'

import {
  createDaytonaSandbox,
  getCommitSHAsFromSandbox,
} from '@/helpers/daytona'
import { getTelemetryTracer } from '@/telemetry'

export type TestStoryTaskResult = {
  evaluation: EvaluationOutput
}

export const testStoryTask = task({
  id: 'test-story',
  run: async (
    payload: {
      storyId: string
      /** The Daytona Sandbox ID */
      daytonaSandboxId?: string
      /** The branch name for cache lookup */
      branchName?: string
      /** The commit SHA for cache lookup */
      commitSha?: string
      /** The run ID for cache metadata */
      runId?: string
    },
    params,
  ): Promise<TestStoryTaskResult> => {
    const { DATABASE_URL } = getConfig()
    const db = createDb({ databaseUrl: DATABASE_URL })

    // Get trigger runId from task ctx (provided by trigger.dev)
    // Update story_test_results with trigger runId if available and if we have a runId
    if (params.ctx?.run?.id && payload.runId) {
      // Find the most recent running story_test_results for this story and runId
      const runningResult = await db
        .select({ id: schema.storyTestResults.id })
        .from(schema.storyTestResults)
        .where(
          and(
            eq(schema.storyTestResults.storyId, payload.storyId),
            eq(schema.storyTestResults.runId, payload.runId),
            eq(schema.storyTestResults.status, 'running'),
          ),
        )
        .orderBy(desc(schema.storyTestResults.startedAt))
        .limit(1)

      if (runningResult[0]) {
        await db
          .update(schema.storyTestResults)
          .set({
            extTriggerDev: {
              runId: params.ctx.run.id,
            },
          })
          .where(eq(schema.storyTestResults.id, runningResult[0].id))
      }
    }

    // Look up the story and associated repository metadata needed for testing
    const storyRecords = await db
      .select({
        id: schema.stories.id,
        story: schema.stories.story,
        repoId: schema.stories.repoId,
        name: schema.stories.name,
        decomposition: schema.stories.decomposition,
        ownerName: schema.owners.login,
        repoName: schema.repos.name,
      })
      .from(schema.stories)
      .innerJoin(schema.repos, eq(schema.repos.id, schema.stories.repoId))
      .innerJoin(schema.owners, eq(schema.owners.id, schema.repos.ownerId))
      .where(eq(schema.stories.id, payload.storyId))
      .limit(1)

    const storyRecord = storyRecords[0]

    if (!storyRecord) {
      throw new Error(`Story ${payload.storyId} not found`)
    }

    Sentry.setUser({ name: `${storyRecord.ownerName}/${storyRecord.repoName}` })

    // We can create a new sandbox if one is not provided
    let daytonaSandboxId = payload.daytonaSandboxId
    if (!payload.daytonaSandboxId) {
      const sandbox = await createDaytonaSandbox({
        repoId: storyRecord.repoId,
      })
      daytonaSandboxId = sandbox.id
    }

    // Check cache if enabled and branchName/runId are provided
    let cacheEntry = null
    let validationResult = null

    if (
      agents.evaluation.options.cacheOptions?.enabled &&
      payload.runId &&
      daytonaSandboxId
    ) {
      const db = createDb({ databaseUrl: DATABASE_URL })

      // Get sandbox to query git log for commit SHAs
      const sandbox = await getDaytonaSandbox(daytonaSandboxId)

      // Get all commit SHAs from the current branch
      const commitSHAs = await getCommitSHAsFromSandbox(sandbox)

      if (!commitSHAs) {
        logger.warn('Failed to get git log, skipping cache lookup', {
          storyId: storyRecord.id,
        })
      } else {
        logger.info('Found commit SHAs in branch', {
          storyId: storyRecord.id,
          commitCount: commitSHAs.length,
        })

        // Search for cache entry - query database with all commit SHAs at once
        // Returns the latest commit SHA that has a cache entry
        cacheEntry = await getCachedEvidence({
          db,
          storyId: storyRecord.id,
          commitSha: commitSHAs,
        })

        if (cacheEntry) {
          logger.info('Found cache entry for story', {
            storyId: storyRecord.id,
            commitSha: cacheEntry.commitSha,
            runId: cacheEntry.runId,
          })

          // Validate cache entry
          const validation = await validateCacheEntry({
            cacheEntry,
            sandbox,
            invalidationStrategy:
              agents.evaluation.options.cacheOptions.invalidationStrategy,
          })

          validationResult = validation

          if (validation.isValid) {
            logger.info('Cache entry is valid, using cached results', {
              storyId: storyRecord.id,
            })
          } else {
            logger.info('Cache entry is invalid, will re-evaluate', {
              storyId: storyRecord.id,
              invalidSteps: validation.invalidSteps,
              invalidAssertions: validation.invalidAssertions,
            })
          }
        } else {
          logger.info('No cache entry found for any commit in branch', {
            storyId: storyRecord.id,
            commitCount: commitSHAs.length,
          })
        }
      }
    }

    /**
     * Agent to evaluate the story
     */
    const evaluation: EvaluationOutput = await agents.evaluation.run({
      repo: {
        id: storyRecord.repoId,
        slug: `${storyRecord.ownerName}/${storyRecord.repoName}`,
      },
      story: {
        id: storyRecord.id,
        name: storyRecord.name,
        text: storyRecord.story,
        decomposition: agents.composition.schema.parse(
          storyRecord.decomposition,
        ),
      },
      options: {
        daytonaSandboxId,
        telemetryTracer: getTelemetryTracer(),
        branchName: payload.branchName,
        runId: payload.runId,
        cacheEntry,
        validationResult,
      },
    })

    logger.info(
      `Story evaluation ${evaluation.status === 'pass' ? '🟢' : '🔴'}`,
      { evaluation },
    )

    return { evaluation }
  },
})
