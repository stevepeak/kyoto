import type { DB } from '@app/db/types'
import type { Insertable } from 'kysely'
import type { Kysely } from 'kysely'
import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'

import { fetchRepositoryCodebase } from './fetch-codebase'
import { generateStories } from './generate-stories'

export interface AnalyzeRepositoryResult {
  success: boolean
  storyCount: number
  error?: string
}

interface AnalyzeRepositoryParams {
  db: Kysely<DB>
  repoId: string
  appId: number
  privateKey: string
  openRouterApiKey: string
}

/**
 * Analyzes a repository by:
 * 1. Fetching the codebase from GitHub (depth 1, default branch)
 * 2. Generating Gherkin-style stories using OpenRouter.ai
 * 3. Storing stories in the database
 */
export async function analyzeRepository(
  params: AnalyzeRepositoryParams,
): Promise<AnalyzeRepositoryResult> {
  const { db, repoId, appId, privateKey, openRouterApiKey } = params

  try {
    // Step 1: Query database to get repo details
    const repo = await db
      .selectFrom('repos')
      .innerJoin('owners', 'repos.ownerId', 'owners.id')
      .select([
        'repos.id',
        'repos.name as repoName',
        'repos.defaultBranch',
        'owners.login as ownerLogin',
        'owners.installationId',
      ])
      .where('repos.id', '=', repoId)
      .executeTakeFirst()

    if (!repo) {
      return {
        success: false,
        storyCount: 0,
        error: `Repository with id ${repoId} not found`,
      }
    }

    if (!repo.defaultBranch) {
      return {
        success: false,
        storyCount: 0,
        error: `Repository ${repo.repoName} has no default branch configured`,
      }
    }

    if (!repo.installationId) {
      return {
        success: false,
        storyCount: 0,
        error: `Owner ${repo.ownerLogin} has no GitHub App installation configured`,
      }
    }

    const installationId = Number(repo.installationId)

    // Step 2: Create Octokit instance with GitHub App auth
    const octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: { appId, privateKey, installationId },
    })

    // Step 3: Fetch codebase
    const codebase = await fetchRepositoryCodebase({
      octokit,
      owner: repo.ownerLogin,
      repo: repo.repoName,
      branch: repo.defaultBranch,
    })

    if (codebase.length === 0) {
      return {
        success: false,
        storyCount: 0,
        error: 'No code files found in repository',
      }
    }

    // Step 4: Get the current commit SHA for the branch
    const branchRef = await octokit.git.getRef({
      owner: repo.ownerLogin,
      repo: repo.repoName,
      ref: `heads/${repo.defaultBranch}`,
    })
    const commitSha = branchRef.data.object.sha

    // Step 5: Generate stories using AI
    const generatedStories = await generateStories({
      codebase,
      apiKey: openRouterApiKey,
    })

    if (generatedStories.length === 0) {
      return {
        success: true,
        storyCount: 0,
        error: 'No stories were generated from the codebase',
      }
    }

    // Step 6: Insert stories into database
    // We already checked defaultBranch is not null above
    const defaultBranchName = repo.defaultBranch
    const storiesToInsert: Array<Insertable<DB['stories']>> =
      generatedStories.map(
        (story: { name: string; story: string; files: string[] }) => ({
          repoId,
          branchName: defaultBranchName,
          commitSha,
          name: story.name,
          story: story.story,
          files: story.files,
        }),
      )

    await db.insertInto('stories').values(storiesToInsert).execute()

    return {
      success: true,
      storyCount: generatedStories.length,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'
    return {
      success: false,
      storyCount: 0,
      error: errorMessage,
    }
  }
}
