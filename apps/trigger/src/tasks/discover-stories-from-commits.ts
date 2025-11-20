import { task, logger, streams } from '@trigger.dev/sdk'
import { setupDb } from '@app/db'
import { agents } from '@app/agents'
import { parseEnv } from '@app/config'
import { createDaytonaSandbox } from '../helpers/daytona'
import { getTelemetryTracer } from '@/telemetry'
import type { StoryDiscoveryOutput } from '@app/agents'
import {
  findMostSimilarStory,
  type StoryForMatching,
} from '@app/agents'
import { findRepoByOwnerAndName } from './github/shared/db'
import { createOctokit, getOctokitClient } from '../helpers/github'
import { Experimental_Agent as Agent, Output } from 'ai'
import { z } from 'zod'
import dedent from 'dedent'
import type { DecompositionOutput } from '@app/schemas'

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
    storyDiff: string
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
 * Note: Code diff is filtered to TypeScript/TSX files only and may be truncated.
 * The sandbox can be used for full context if needed.
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

    ## Changed Files (TypeScript/TSX only)
    ${changedFiles.map((f) => `- ${f}`).join('\n')}

    ## Commit Messages
    ${commitMessages.map((msg, i) => `${i + 1}. ${msg}`).join('\n')}

    ## Code Diff (TypeScript/TSX files only, may be truncated - sandbox available for full context)
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
 * Filters to only TypeScript/TSX files and truncates to avoid context overflow
 * Note: The sandbox can be used for full context if needed
 */
async function getGitHubDiff(
  octokit: ReturnType<typeof createOctokit>,
  owner: string,
  repo: string,
  base: string,
  head: string,
  maxDiffSize: number = 50000, // ~50KB max diff size
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

  // Filter to only TypeScript/TSX files
  const tsFiles =
    comparison.data.files?.filter(
      (file) =>
        file.filename.endsWith('.ts') || file.filename.endsWith('.tsx'),
    ) || []

  // Build diff string, truncating if necessary
  let diff = ''
  let totalSize = 0
  const truncatedFiles: string[] = []

  for (const file of tsFiles) {
    const fileDiff = `diff --git a/${file.filename} b/${file.filename}\nindex ${file.sha}..${file.sha}\n--- a/${file.filename}\n+++ b/${file.filename}\n${file.patch || ''}`
    const fileDiffSize = fileDiff.length

    if (totalSize + fileDiffSize > maxDiffSize) {
      // Truncate this file's diff if adding it would exceed the limit
      const remainingSpace = maxDiffSize - totalSize
      if (remainingSpace > 100) {
        // Only add if we have meaningful space left
        const truncatedPatch = file.patch
          ? file.patch.substring(0, remainingSpace - 200) +
            '\n... (diff truncated - use sandbox for full context)'
          : ''
        diff += `diff --git a/${file.filename} b/${file.filename}\nindex ${file.sha}..${file.sha}\n--- a/${file.filename}\n+++ b/${file.filename}\n${truncatedPatch}\n\n`
        truncatedFiles.push(file.filename)
      }
      break
    }

    diff += fileDiff + '\n\n'
    totalSize += fileDiffSize
  }

  const changedFiles = tsFiles.map((file) => file.filename)

  if (truncatedFiles.length > 0) {
    logger.info('Diff truncated due to size limit', {
      owner,
      repo,
      truncatedFileCount: truncatedFiles.length,
      totalSize,
      maxDiffSize,
      truncatedFiles,
    })
  }

  logger.info('Fetched diff from GitHub', {
    owner,
    repo,
    changedFileCount: changedFiles.length,
    diffLength: diff.length,
    truncatedFileCount: truncatedFiles.length,
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
 * Generate a story diff using AI to compare existing story with new findings
 * Uses the existing story as the baseline and asks AI what needs to change
 */
async function generateStoryDiff(
  existingStory: {
    id: string
    name: string
    story: string
  },
  discoveredStory: {
    title?: string
    text: string
  },
  codeDiff: string,
  commitMessages: string[],
  changedFiles: string[],
): Promise<string> {
  const env = parseEnv()
  const model = agents.discovery.options.model

  const agent = new Agent({
    model,
    system: dedent`
      You are an expert story analyst tasked with comparing an existing user story with new findings from code changes.

      # Your Task
      Compare the existing story (which is the baseline/truth) with the newly discovered story text and code changes.
      Determine what changes need to be made to the existing story to align it with the new findings.

      # Output Format
      Provide a clear, structured diff showing:
      1. What parts of the existing story should remain unchanged
      2. What parts should be modified and how
      3. What new elements should be added
      4. What should be removed (if anything)

      Format your response as a story diff, showing:
      - Lines that remain the same (with context)
      - Lines that need modification (show old → new)
      - New lines to add
      - Lines to remove

      Focus on making the existing story accurately reflect the current state of the codebase based on the changes.
    `,
  })

  const prompt = dedent`
    Compare the existing story with new findings and generate a story diff.

    ## Existing Story (Baseline)
    **Title:** ${existingStory.name}
    **Story Text:**
    ${existingStory.story}

    ## New Findings
    **Discovered Title:** ${discoveredStory.title || 'N/A'}
    **Discovered Story Text:**
    ${discoveredStory.text}

    ## Code Changes Context
    **Changed Files:**
    ${changedFiles.map((f) => `- ${f}`).join('\n')}

    **Commit Messages:**
    ${commitMessages.map((msg, i) => `${i + 1}. ${msg}`).join('\n')}

    **Code Diff (truncated - sandbox available for full context):**
    \`\`\`
    ${codeDiff.substring(0, 5000)}${codeDiff.length > 5000 ? '\n... (diff truncated)' : ''}
    \`\`\`

    Generate a story diff showing what changes need to be made to the existing story to align with the new findings.
    Use the existing story as the baseline and show what modifications are needed.
  `

  logger.info('Generating story diff', {
    existingStoryId: existingStory.id,
    existingStoryName: existingStory.name,
  })

  const result = await agent.generate({ prompt })

  return result.text
}

/**
 * Compare discovered stories with existing stories to find changes
 * Uses semantic similarity (embeddings) to match stories and AI to generate story diffs
 */
async function compareStories(
  discoveredStories: StoryDiscoveryOutput,
  existingStories: StoryForMatching[],
  codeDiff: string,
  commitMessages: string[],
  changedFiles: string[],
): Promise<StoryComparisonResult> {
  logger.info('Comparing discovered stories with existing stories using semantic matching', {
    discoveredCount: discoveredStories.stories.length,
    existingCount: existingStories.length,
  })

  const potentiallyChangedStories: StoryComparisonResult['potentiallyChangedStories'] =
    []
  const potentiallyNewStories: StoryComparisonResult['potentiallyNewStories'] =
    []

  // Build query text for each discovered story (same format as buildStoryText)
  function buildQueryText(discovered: { title?: string; text: string }): string {
    const parts: string[] = []
    const title = discovered.title || discovered.text.split('\n')[0] || ''
    parts.push(`Title: ${title}`)
    parts.push(`Story: ${discovered.text}`)
    return parts.join('\n\n')
  }

  // For each discovered story, find the most similar existing story using semantic search
  for (const discovered of discoveredStories.stories) {
    const title = discovered.title || discovered.text.split('\n')[0] || ''
    const queryText = buildQueryText(discovered)

    logger.info('Finding semantic match for discovered story', {
      discoveredTitle: title,
      queryTextLength: queryText.length,
    })

    void streams.append(
      'progress',
      `Finding semantic match for "${title}"`,
    )

    // Use semantic matching with a threshold of 0.7
    const match = await findMostSimilarStory(existingStories, queryText, 0.7)

    if (match) {
      // Generate story diff using AI
      logger.info('Generating story diff for semantically matched story', {
        existingStoryId: match.story.id,
        existingStoryName: match.story.name,
        discoveredTitle: title,
        similarity: match.similarity,
      })

      void streams.append(
        'progress',
        `Generating story diff for "${match.story.name}" (similarity: ${(match.similarity * 100).toFixed(1)}%)`,
      )

      const storyDiff = await generateStoryDiff(
        {
          id: match.story.id,
          name: match.story.name,
          story: match.story.story,
        },
        discovered,
        codeDiff,
        commitMessages,
        changedFiles,
      )

      // Potentially changed story
      potentiallyChangedStories.push({
        existingStory: {
          id: match.story.id,
          name: match.story.name,
          story: match.story.story,
        },
        storyDiff,
        reason: `Story "${title}" semantically matches existing story "${match.story.name}" (similarity: ${(match.similarity * 100).toFixed(1)}%) and may have been modified`,
      })
    } else {
      // Potentially new story - no semantic match found above threshold
      logger.info('No semantic match found for discovered story', {
        discoveredTitle: title,
      })
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

      // Get existing stories with decomposition (for semantic matching)
      // Load stories that are active, paused, or generated (not archived)
      const existingStoriesRaw = await db
        .selectFrom('stories')
        .select(['id', 'name', 'story', 'decomposition'])
        .where('repoId', '=', repoRecord.repoId)
        .where('state', 'in', ['active', 'paused', 'generated'])
        .execute()

      // Transform to StoryForMatching format
      const existingStories: StoryForMatching[] = existingStoriesRaw.map(
        (story) => ({
          id: story.id,
          name: story.name,
          story: story.story,
          decomposition: story.decomposition as DecompositionOutput | null,
        }),
      )

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

        // Compare stories - uses AI to generate story diffs
        const comparison = await compareStories(
          discoveryResult,
          existingStories,
          diff,
          commitMessages,
          changedFiles,
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
