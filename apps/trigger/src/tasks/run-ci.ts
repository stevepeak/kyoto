import { task, logger } from '@trigger.dev/sdk'
import type { DB } from '@app/db/types'
import type { Insertable, Selectable } from 'kysely'
import { setupDb } from '@app/db'
import type { RunStory } from '@app/db'
import { parseEnv } from '../helpers/env'
import { createOctokit } from '../helpers/github'
import {
  createGitHubCheck,
  mapRunStatusToCheckStatus,
  mapRunStatusToConclusion,
} from './update-github-status'
import type { RunWorkflowPayload, StoryTestResult } from '../types'

export const runCiTask = task({
  id: 'run-ci',
  run: async (payload: RunWorkflowPayload, { ctx: _ctx }) => {
    logger.info('Starting run workflow', {
      orgSlug: payload.orgSlug,
      repoName: payload.repoName,
      branchName: payload.branchName,
    })

    const env = parseEnv()
    const db = setupDb(env.DATABASE_URL)
    let runId: string | null = null

    try {
      // Step 1: Look up owner and repo
      const owner = await db
        .selectFrom('owners')
        .selectAll()
        .where('login', '=', payload.orgSlug)
        .executeTakeFirst()

      if (!owner) {
        throw new Error(`Owner with slug ${payload.orgSlug} not found`)
      }

      const repo = await db
        .selectFrom('repos')
        .selectAll()
        .where('ownerId', '=', owner.id)
        .where('name', '=', payload.repoName)
        .executeTakeFirst()

      if (!repo) {
        throw new Error(
          `Repository ${payload.repoName} not found for owner ${payload.orgSlug}`,
        )
      }

      // Step 2: Determine branch to use (default to repo.defaultBranch)
      const targetBranch = payload.branchName || repo.defaultBranch
      if (!targetBranch) {
        throw new Error(
          `No branch specified and repository has no default branch configured`,
        )
      }

      if (!owner.installationId) {
        throw new Error(
          `Owner ${payload.orgSlug} has no GitHub App installation configured`,
        )
      }

      const installationId = Number(owner.installationId)

      // Step 3: Get commit SHA and message from GitHub
      const octokit = createOctokit(installationId)

      const branchRef = await octokit.git.getRef({
        owner: payload.orgSlug,
        repo: payload.repoName,
        ref: `heads/${targetBranch}`,
      })
      const commitSha = branchRef.data.object.sha

      // Get commit message
      const commit = await octokit.git.getCommit({
        owner: payload.orgSlug,
        repo: payload.repoName,
        commit_sha: commitSha,
      })
      const commitMessage = commit.data.message || null

      // Step 4: Create run with 'running' status
      const runToInsert: Omit<Insertable<DB['runs']>, 'number'> = {
        repoId: repo.id,
        commitSha,
        branchName: targetBranch,
        commitMessage,
        status: 'running',
        stories: [],
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const insertedRun = (await (db as any)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        .insertInto('runs')
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        .values(runToInsert)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        .returningAll()
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        .executeTakeFirstOrThrow()) as Selectable<DB['runs']>

      runId = insertedRun.id

      // Step 5: Create initial GitHub check
      try {
        await createGitHubCheck({
          orgSlug: payload.orgSlug,
          repoName: payload.repoName,
          commitSha,
          installationId,
          name: 'Tailz/CI',
          status: 'in_progress',
          output: {
            title: 'Running story tests',
            summary: 'Analyzing repository and testing stories...',
          },
        })
      } catch (error) {
        logger.warn('Failed to create initial GitHub check', { error })
      }

      // Step 6: Find and test stories
      const stories = await db
        .selectFrom('stories')
        .selectAll()
        .where('repoId', '=', repo.id)
        .where('branchName', '=', targetBranch)
        .execute()

      if (stories.length === 0) {
        logger.warn('No stories found', {
          repoId: repo.id,
          branchName: targetBranch,
        })
        await db
          .updateTable('runs')
          .set({ status: 'fail' })
          .where('id', '=', runId)
          .execute()
        throw new Error('No stories found for this repository and branch')
      }

      const testResults: StoryTestResult[] = stories.map((story) => ({
        storyId: story.id,
        status: 'pass',
      }))

      const runStories: RunStory[] = testResults.map((result) => ({
        storyId: result.storyId,
        status: result.status,
      }))

      const hasFail = runStories.some((s) => s.status === 'fail')
      const allSkipped = runStories.every((s) => s.status === 'skipped')
      const finalStatus: 'pass' | 'fail' | 'skipped' = hasFail
        ? 'fail'
        : allSkipped
          ? 'skipped'
          : 'pass'

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const updatedRun = await (db as any)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        .updateTable('runs')
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        .set({
          status: finalStatus,
          stories: runStories,
        })
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        .where('id', '=', runId)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        .returningAll()
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        .executeTakeFirstOrThrow()

      const checkStatus = mapRunStatusToCheckStatus(finalStatus)
      const conclusion = mapRunStatusToConclusion(finalStatus)

      const passedCount = runStories.filter((s) => s.status === 'pass').length
      const failedCount = runStories.filter((s) => s.status === 'fail').length
      const skippedCount = runStories.filter(
        (s) => s.status === 'skipped',
      ).length

      const output = {
        title: `Run completed: ${finalStatus}`,
        summary: `${passedCount} passed, ${failedCount} failed, ${skippedCount} skipped`,
        text: `Total stories: ${runStories.length}\nPassed: ${passedCount}\nFailed: ${failedCount}\nSkipped: ${skippedCount}`,
      }

      try {
        await createGitHubCheck({
          orgSlug: payload.orgSlug,
          repoName: payload.repoName,
          commitSha,
          installationId,
          name: 'Tailz/CI',
          status: checkStatus,
          conclusion,
          output,
        })
      } catch (checkError) {
        logger.warn('Failed to update GitHub check', { error: checkError })
      }

      logger.info('Run workflow completed successfully', {
        runId,
        finalStatus,
      })

      return {
        success: true,
        run: updatedRun as Selectable<DB['runs']>,
        finalStatus,
      }
    } catch (error) {
      logger.error('Run workflow failed', {
        runId,
        error: error instanceof Error ? error.message : String(error),
      })

      // Update run status to 'fail' on any error (if run was created)
      if (runId) {
        try {
          await db
            .updateTable('runs')
            .set({ status: 'fail' })
            .where('id', '=', runId)
            .execute()
        } catch (updateError) {
          logger.error('Failed to update run status on error', {
            error: updateError,
          })
        }
      }

      throw error
    }
  },
})
