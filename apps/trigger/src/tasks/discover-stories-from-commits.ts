import { task, logger, streams } from '@trigger.dev/sdk'
import { setupDb } from '@app/db'
import { agents } from '@app/agents'
import { parseEnv } from '@app/config'
import { createDaytonaSandbox } from '../helpers/daytona'
import { getTelemetryTracer } from '@/telemetry'
import type { StoryDiscoveryOutput } from '@app/agents'
import { findRepoByOwnerAndName } from './github/shared/db'
import { createOctokit, getOctokitClient } from '../helpers/github'
import { Experimental_Agent as Agent, Output } from 'ai'
import { z } from 'zod'
import dedent from 'dedent'

interface DiscoverStoriesFromCommitsPayload {
  /** Repository slug in format {owner}/{repo} */
  repo: string
  /** Commit SHA after the push */
  after: string
  /** Commit SHA before the push */
  before: string
}

interface ClueAnalysisResult {
  hasClues: boolean
  clues: string[]
  explanation: string
}

interface StoryComparisonResult {
  potentiallyChangedStories: Array<{
    existingStory: {
      id: string
      name: string
      story: string
    }
    diff: string
    reason: string
  }>
  potentiallyNewStories: Array<{
    title: string
    text: string
  }>
}

const clueAnalysisOutputSchema = z.object({
  hasClues: z.boolean().describe('Whether there are clues suggesting feature changes'),
  clues: z
    .array(z.string())
    .describe('List of specific clues or indicators of potential feature changes'),
  explanation: z
    .string()
    .describe('Explanation of why clues were or were not found'),
})

/**
 * Agent to analyze commits and code diff for clues about potential feature changes
 */
async function analyzeClues(
  repoSlug: string,
  commitMessages: string[],
  codeDiff: string,
  changedFiles: string[],
): Promise<ClueAnalysisResult> {
  const env = parseEnv()
  const model = agents.discovery.options.model

  const agent = new Agent({
    model,
    system: dedent`
      You are an expert code analyst tasked with determining if a set of commits and code changes contain clues about potential feature changes or new functionality.

      # Your Task
      Analyze the provided commit messages and code diff to determine if there are any clues suggesting:
      - New features being added
      - Existing features being modified
      - User-facing changes
      - API changes
      - UI/UX changes
      - Behavioral changes

      # What to Look For
      - Commit messages mentioning features, fixes, additions, changes
      - Code changes in user-facing components (UI, API endpoints, routes)
      - New files being added
      - Significant modifications to existing functionality
      - Changes that affect user workflows

      # What to Ignore
      - Pure refactoring (renaming, code style changes)
      - Dependency updates
      - Configuration changes
      - Test-only changes
      - Documentation-only changes
      - Build/deployment changes

      # Output
      Return whether clues exist, list specific clues found, and explain your reasoning.
    `,
    experimental_output: Output.object({ schema: clueAnalysisOutputSchema }),
  })

  const prompt = dedent`
    Analyze these commits and code changes for clues about potential feature changes:

    ## Repository
    ${repoSlug}

    ## Changed Files
    ${changedFiles.map((f) => `- ${f}`).join('\n')}

    ## Commit Messages
    ${commitMessages.map((msg, i) => `${i + 1}. ${msg}`).join('\n')}

    ## Code Diff
    \`\`\`
    ${codeDiff}
    \`\`\`

    Determine if there are clues suggesting feature changes and list them.
  `

  logger.info('Analyzing clues from commits', {
    repoSlug,
    commitCount: commitMessages.length,
    changedFileCount: changedFiles.length,
  })

  const result = await agent.generate({ prompt })

  return result.experimental_output
}

/**
 * Get code diff from GitHub between two commits
 */
async function getGitHubDiff(
  octokit: ReturnType<typeof createOctokit>,
  owner: string,
  repo: string,
  base: string,
  head: string,
): Promise<{ diff: string; changedFiles: string[] }> {
  logger.info('Fetching diff from GitHub', {
    owner,
    repo,
    base,
    head,
  })

  const comparison = await octokit.rest.repos.compareCommits({
    owner,
    repo,
    base,
    head,
  })

  const diff = comparison.data.files
    ?.map((file) => {
      const status = file.status
      const filename = file.filename
      const patch = file.patch || ''
      return `diff --git a/${filename} b/${filename}\nindex ${file.sha}..${file.sha}\n--- a/${filename}\n+++ b/${filename}\n${patch}`
    })
    .join('\n\n')
    || ''

  const changedFiles =
    comparison.data.files?.map((file) => file.filename).filter(Boolean) || []

  logger.info('Fetched diff from GitHub', {
    owner,
    repo,
    changedFileCount: changedFiles.length,
    diffLength: diff.length,
  })

  return { diff, changedFiles }
}

/**
 * Get commit messages for a range of commits
 */
async function getCommitMessages(
  octokit: ReturnType<typeof createOctokit>,
  owner: string,
  repo: string,
  base: string,
  head: string,
): Promise<string[]> {
  logger.info('Fetching commit messages', {
    owner,
    repo,
    base,
    head,
  })

  const commits = await octokit.rest.repos.compareCommits({
    owner,
    repo,
    base,
    head,
  })

  const messages =
    commits.data.commits
      ?.map((commit) => commit.commit.message)
      .filter(Boolean) || []

  logger.info('Fetched commit messages', {
    owner,
    repo,
    commitCount: messages.length,
  })

  return messages
}

/**
 * Compare discovered stories with existing stories to find changes
 */
async function compareStories(
  discoveredStories: StoryDiscoveryOutput,
  existingStories: Array<{
    id: string
    name: string
    story: string
  }>,
  codeDiff: string,
): Promise<StoryComparisonResult> {
  logger.info('Comparing discovered stories with existing stories', {
    discoveredCount: discoveredStories.stories.length,
    existingCount: existingStories.length,
  })

  const potentiallyChangedStories: StoryComparisonResult['potentiallyChangedStories'] =
    []
  const potentiallyNewStories: StoryComparisonResult['potentiallyNewStories'] =
    []

  // For each discovered story, check if it matches an existing story
  for (const discovered of discoveredStories.stories) {
    const title = discovered.title || discovered.text.split('\n')[0] || ''

    // Try to find a matching existing story by title similarity
    const matchingStory = existingStories.find((existing) => {
      const existingTitle = existing.name.toLowerCase()
      const discoveredTitle = title.toLowerCase()
      // Simple matching - could be improved with fuzzy matching
      return (
        existingTitle === discoveredTitle ||
        existingTitle.includes(discoveredTitle) ||
        discoveredTitle.includes(existingTitle)
      )
    })

    if (matchingStory) {
      // Potentially changed story
      potentiallyChangedStories.push({
        existingStory: {
          id: matchingStory.id,
          name: matchingStory.name,
          story: matchingStory.story,
        },
        diff: codeDiff, // Include full diff for context
        reason: `Story "${title}" matches existing story "${matchingStory.name}" and may have been modified`,
      })
    } else {
      // Potentially new story
      potentiallyNewStories.push({
        title,
        text: discovered.text,
      })
    }
  }

  logger.info('Story comparison completed', {
    changedCount: potentiallyChangedStories.length,
    newCount: potentiallyNewStories.length,
  })

  return {
    potentiallyChangedStories,
    potentiallyNewStories,
  }
}

export const discoverStoriesFromCommitsTask = task({
  id: 'discover-stories-from-commits',
  run: async ({
    repo: repoSlug,
    after,
    before,
  }: DiscoverStoriesFromCommitsPayload) => {
    const env = parseEnv()
    const db = setupDb(env.DATABASE_URL)

    logger.info('Starting story discovery from commits', {
      repoSlug,
      after,
      before,
    })

    void streams.append('progress', `Starting story discovery for ${repoSlug}`)

    try {
      // Parse repo slug
      const [ownerLogin, repoName] = repoSlug.split('/')
      if (!ownerLogin || !repoName) {
        throw new Error(
          `Invalid repo slug format: ${repoSlug}. Expected format: owner/repo`,
        )
      }

      logger.info('Step 1: Finding repository in database', { repoSlug })

      // Find repository
      const repoRecord = await findRepoByOwnerAndName(db, {
        ownerLogin,
        repoName,
      })

      if (!repoRecord) {
        throw new Error(
          `Repository ${repoSlug} not found in database. Make sure the repository is installed and enabled.`,
        )
      }

      logger.info('Step 2: Getting GitHub client', {
        repoId: repoRecord.repoId,
      })

      // Get GitHub client
      const { octokit } = await getOctokitClient(repoRecord.repoId)

      logger.info('Step 3: Fetching commit messages', {
        ownerLogin,
        repoName,
        before,
        after,
      })

      // Get commit messages
      const commitMessages = await getCommitMessages(
        octokit,
        ownerLogin,
        repoName,
        before,
        after,
      )

      logger.info('Step 4: Fetching code diff', {
        ownerLogin,
        repoName,
        before,
        after,
      })

      // Get code diff
      const { diff, changedFiles } = await getGitHubDiff(
        octokit,
        ownerLogin,
        repoName,
        before,
        after,
      )

      logger.info('Step 5: Checking for TypeScript/TSX file changes', {
        changedFileCount: changedFiles.length,
      })

      // Check if any TypeScript/TSX files changed
      const hasTsFiles = changedFiles.some(
        (file) => file.endsWith('.ts') || file.endsWith('.tsx'),
      )

      if (!hasTsFiles) {
        logger.info('No TypeScript/TSX files changed, exiting', {
          changedFiles,
        })
        void streams.append(
          'progress',
          'No TypeScript/TSX files changed, skipping story discovery',
        )
        return {
          skipped: true,
          reason: 'No TypeScript/TSX files changed',
          changedFiles,
        }
      }

      logger.info('Step 6: Analyzing clues from commits', {
        commitCount: commitMessages.length,
        changedFileCount: changedFiles.length,
      })

      void streams.append('progress', 'Analyzing commits for feature change clues')

      // Analyze clues
      const clueAnalysis = await analyzeClues(
        repoSlug,
        commitMessages,
        diff,
        changedFiles,
      )

      logger.info('Clue analysis completed', {
        hasClues: clueAnalysis.hasClues,
        clueCount: clueAnalysis.clues.length,
      })

      if (!clueAnalysis.hasClues) {
        logger.info('No clues found, exiting', {
          explanation: clueAnalysis.explanation,
        })
        void streams.append(
          'progress',
          'No clues found for feature changes, skipping story discovery',
        )
        return {
          skipped: true,
          reason: 'No clues found for feature changes',
          clueAnalysis,
          changedFiles,
        }
      }

      logger.info('Step 7: Getting existing stories for comparison', {
        repoId: repoRecord.repoId,
      })

      void streams.append('progress', 'Fetching existing stories for comparison')

      // Get existing stories
      const existingStories = await db
        .selectFrom('stories')
        .select(['id', 'name', 'story'])
        .where('repoId', '=', repoRecord.repoId)
        .where('state', '!=', 'archived')
        .execute()

      logger.info('Step 8: Creating sandbox for story discovery', {
        repoId: repoRecord.repoId,
      })

      void streams.append('progress', 'Creating sandbox for code analysis')

      // Create sandbox
      const sandbox = await createDaytonaSandbox({
        repoId: repoRecord.repoId,
      })

      try {
        logger.info('Step 9: Running story discovery agent', {
          repoId: repoRecord.repoId,
          clueCount: clueAnalysis.clues.length,
        })

        void streams.append('progress', 'Discovering stories from code changes')

        // Run story discovery agent with context
        const discoveryResult = await agents.discovery.run({
          repo: {
            id: repoRecord.repoId,
            slug: repoSlug,
          },
          options: {
            daytonaSandboxId: sandbox.id,
            storyCount: 10, // Discover up to 10 stories
            telemetryTracer: getTelemetryTracer(),
            model: agents.discovery.options.model,
            existingStoryTitles: existingStories.map((s) => s.name),
            commitContext: {
              commitMessages,
              codeDiff: diff,
              changedFiles,
              clues: clueAnalysis.clues,
            },
          },
        })

        logger.info('Step 10: Comparing discovered stories with existing ones', {
          discoveredCount: discoveryResult.stories.length,
          existingCount: existingStories.length,
        })

        void streams.append('progress', 'Comparing discovered stories')

        // Compare stories
        const comparison = await compareStories(
          discoveryResult,
          existingStories,
          diff,
        )

        logger.info('Story discovery completed', {
          repoSlug,
          discoveredCount: discoveryResult.stories.length,
          changedCount: comparison.potentiallyChangedStories.length,
          newCount: comparison.potentiallyNewStories.length,
        })

        void streams.append('progress', 'Story discovery completed')

        return {
          codeDiff: diff,
          changedFiles,
          commitMessages,
          clueAnalysis,
          potentiallyChangedStories: comparison.potentiallyChangedStories,
          potentiallyNewStories: comparison.potentiallyNewStories,
        }
      } finally {
        await sandbox.delete()
      }
    } catch (error) {
      logger.error('Story discovery from commits failed', {
        repoSlug,
        after,
        before,
        error,
      })
      throw error
    } finally {
      await db.destroy()
    }
  },
})
