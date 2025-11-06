import { task, logger } from '@trigger.dev/sdk'
import { setupDb } from '@app/db'
import { createOctokit } from '../helpers/github'
import { parseEnv } from '../helpers/env'
import type { CodebaseFile } from '../steps/fetch-codebase'
import { discoverStories } from '../steps/discover-stories'

export const findStoriesInCommitTask = task({
  id: 'find-stories-in-commit',
  run: async (payload: { repoId: string; commitSha: string }) => {
    logger.info('Finding stories in commit', {
      repoId: payload.repoId,
      commitSha: payload.commitSha,
    })

    const env = parseEnv()
    const db = setupDb(env.DATABASE_URL)

    const repo = await db
      .selectFrom('repos')
      .innerJoin('owners', 'repos.ownerId', 'owners.id')
      .select([
        'repos.name as repoName',
        'owners.login as ownerLogin',
        'owners.installationId',
      ])
      .where('repos.id', '=', payload.repoId)
      .executeTakeFirst()

    if (!repo || !repo.installationId) {
      throw new Error('Repository or installation not found or misconfigured')
    }

    const octokit = createOctokit(Number(repo.installationId))

    const commit = await octokit.repos.getCommit({
      owner: repo.ownerLogin,
      repo: repo.repoName,
      ref: payload.commitSha,
    })

    const files = commit.data.files || []
    const changedPaths = files
      .filter((f) => f.status !== 'removed' && !!f.filename)
      .map((f) => f.filename)

    const codebase: CodebaseFile[] = []
    for (const path of changedPaths) {
      try {
        const content = await octokit.repos.getContent({
          owner: repo.ownerLogin,
          repo: repo.repoName,
          path,
          ref: payload.commitSha,
        })
        if (
          !Array.isArray(content.data) &&
          content.data.type === 'file' &&
          'content' in content.data &&
          content.data.content
        ) {
          const decoded = Buffer.from(content.data.content, 'base64').toString(
            'utf8',
          )
          codebase.push({ path, content: decoded })
        }
      } catch (_e) {
        // skip files we fail to fetch (binary or too large)
      }
    }

    const result = await discoverStories({
      codebase,
      apiKey: env.OPENROUTER_API_KEY,
    })

    if (!result.success) {
      logger.error('Failed to find stories in commit', {
        repoId: payload.repoId,
        commitSha: payload.commitSha,
        error: result.error,
      })
      throw new Error(result.error || 'Failed to find stories in commit')
    }

    logger.info('Stories found in commit', {
      repoId: payload.repoId,
      commitSha: payload.commitSha,
      storyCount: result.storyCount,
    })

    return {
      success: true,
      storyCount: result.storyCount,
      stories: result.stories,
    }
  },
})
