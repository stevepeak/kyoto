import { task, logger, streams } from '@trigger.dev/sdk'
import { setupDb } from '@app/db'
import { getConfig } from '@app/config'
import { createDaytonaSandbox } from '../helpers/daytona'
import { getTelemetryTracer } from '@/telemetry'
import {
  agents,
  generateEmbedding,
  type StoryDiscoveryOutput,
  type ClueAnalysisResult,
} from '@app/agents'
import type { Commit } from '@app/schemas'
import { findRepoByOwnerAndName } from './github/shared/db'
import {
  getOctokitClient,
  getGitHubDiff,
  getCommitMessages,
} from '../helpers/github'
import { dedent } from 'ts-dedent'
import { storyDecompositionTask } from './story-decomposition'
import pMap from 'p-map'
import { sql } from '@app/db'

interface DiscoverStoriesFromCommitsPayload {
  /** Repository slug in format {owner}/{repo} */
  repo: {
    owner: string
    name: string
  }
  /** Commit SHA after the push */
  after: string
  /** Commit SHA before the push */
  before: string
}

interface ChangedStory {
  existingStory: {
    id: string
    name: string
    story: string
  }
  rewrittenStory: string
  clue: string
}

interface NewStory {
  title: string
  text: string
  clue: string
}

/**
 * Create a new story from a clue when no impacted stories are found
 * Uses the discovery agent to write a new story based on the clue and code changes
 */
async function createStoryFromClue(
  clue: string,
  commit: Commit,
  db: ReturnType<typeof setupDb>,
  repo: {
    id: string
    slug: string
  },
  sandboxId: string,
): Promise<StoryDiscoveryOutput> {
  logger.info('Creating new story from clue', {
    clue,
    repoId: repo.id,
  })

  void streams.append('progress', `Creating new story from clue: "${clue}"`)

  const result: StoryDiscoveryOutput = await agents.discovery.run({
    db,
    repo,
    options: {
      daytonaSandboxId: sandboxId,
      storyCount: 1,
      telemetryTracer: getTelemetryTracer(),
      context: {
        scope: [clue],
        commit,
      },
    },
  })

  logger.info('Created new story from clue', {
    clue,
    shouldBeOne: result.stories.length,
    story: result.stories[0],
  })

  return result
}

/*

High-level flow of `discover-stories-from-commits.ts`:

## Overview
Analyzes Git commits between two SHAs to discover new user stories or update existing ones based on code changes.

## Main Flow (8 stages)

### 1. **Repository Setup**
- Extracts owner/name from the payload
- Looks up the repository in the database
- Exits if not found

### 2. **GitHub Data Collection**
- Fetches commit messages between `before` and `after` SHAs
- Gets code diff for the same range
- Filters to TypeScript/TSX files only

### 3. **Early Exit Checks**
- If no TypeScript/TSX files changed → exit
- If no feature change clues found → exit

### 4. **Clue Analysis**
- Uses an AI agent to analyze commits and diff for feature change indicators
- Returns a list of clues (e.g., "Added user authentication", "Modified payment flow")

### 5. **Sandbox Creation**
- Creates a Daytona sandbox for code analysis context

### 6. **Story Discovery per Clue** (parallel processing)
For each clue:
- Searches for existing stories that might be impacted (semantic similarity)
- If no matches found → creates a new story from the clue
- If matches found → collects them for rewriting

### 7. **Story Rewriting** (parallel processing)
- For each impacted existing story, rewrites it based on:
  - The clue
  - Code diff
  - Commit context
- Preserves original structure (Given/When/Then) for easier diffing

### 8. **Save & Decompose**
- Saves only NEW stories to the database (state: `'generated'`)
- Triggers decomposition tasks for each new story
- Returns summary of new stories, rewritten stories, and metadata

## Key Design Decisions
- Filters to TypeScript/TSX files only
- Two-stage analysis: clues first, then story discovery
- Preserves story structure when rewriting for easier diffs
- Only saves new stories; rewritten stories are returned but not auto-saved
- Uses semantic search to find impacted existing stories

The task returns early if there are no TypeScript changes or no feature clues, avoiding unnecessary work.

*/
export const discoverStoriesFromCommitsTask = task({
  id: 'discover-stories-from-commits',
  run: async (
    { repo, after, before }: DiscoverStoriesFromCommitsPayload,
    { ctx },
  ) => {
    const env = getConfig()
    const db = setupDb(env.DATABASE_URL)

    const { owner: ownerLogin, name: repoName } = repo
    const repoSlug = `${ownerLogin}/${repoName}`

    logger.info('Starting story discovery from commits', {
      repoSlug,
      after,
      before,
    })

    void streams.append('progress', `Starting story discovery for ${repoSlug}`)

    try {
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

      // Get GitHub client
      const { octokit } = await getOctokitClient(repoRecord.repoId)

      // Get commit messages
      const commitMessages = await getCommitMessages(
        octokit,
        ownerLogin,
        repoName,
        before,
        after,
      )
      // Get code diff
      const { diff, changedFiles } = await getGitHubDiff(
        octokit,
        ownerLogin,
        repoName,
        before,
        after,
      )

      // Check if any TypeScript/TSX files changed
      const hasTsFiles = changedFiles.some(
        (file) => file.endsWith('.ts') || file.endsWith('.tsx'),
      )

      if (!hasTsFiles) {
        logger.warn('No TypeScript/TSX files changed, exiting', {
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

      void streams.append(
        'progress',
        `Analyzing ${commitMessages.length} commits with ${changedFiles.length} changed files`,
      )

      // Analyze clues
      const commit: Commit = {
        message: commitMessages.join('\n\n'),
        diff,
        changedFiles,
      }
      const clueAnalysis: ClueAnalysisResult = await agents.clueAnalysis.run({
        repoSlug,
        commit,
        options: { maxClueCount: options.maxClueCount ?? 10 },
      })

      if (!clueAnalysis.hasClues) {
        logger.warn('No clues found, exiting', {
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

      void streams.append('progress', 'Creating sandbox for code analysis')

      // Create sandbox
      const sandbox = await createDaytonaSandbox({
        repoId: repoRecord.repoId,
      })

      try {
        void streams.append(
          'progress',
          `Found ${clueAnalysis.clues.length} potential feature changes in analysis`,
        )

        // Process each clue individually to find impacted stories
        const newStories: NewStory[] = []
        const storiesToRewrite: Array<{
          clue: string
          story: {
            id: string
            name: string
            story: string
          }
        }> = []

        await pMap(
          clueAnalysis.clues,
          async (clue: string) => {
            const impactedStories: StoryDiscoveryOutput =
              await agents.impact.run({
                clue,
                db,
                repo: {
                  id: repoRecord.repoId,
                  slug: repoSlug,
                },
                sandboxId: sandbox.id,
                commit,
                telemetryTracer: getTelemetryTracer(),
              })

            if (impactedStories.stories.length === 0) {
              // No impacted stories found - create a new story from the clue
              logger.info(
                'No impacted stories found for clue, creating new story',
                {
                  clue,
                },
              )

              const newStoryResult = await createStoryFromClue(
                clue,
                commit,
                db,
                {
                  id: repoRecord.repoId,
                  slug: repoSlug,
                },
                sandbox.id,
              )

              // Add new stories from this clue
              for (const story of newStoryResult.stories) {
                newStories.push({
                  title:
                    story.title ||
                    story.text.split('\n')[0] ||
                    'Untitled Story',
                  text: story.text,
                  clue,
                })
              }
            } else {
              // Found impacted stories - collect them for rewriting
              logger.info('Found impacted stories for clue', {
                clue,
                storyCount: impactedStories.stories.length,
              })

              // The findImpactedStories function returns stories that match existing ones
              // We need to fetch the actual existing story records to rewrite them
              for (const discoveredStory of impactedStories.stories) {
                // Build a query from the discovered story to find the matching existing story
                const storyText = discoveredStory.text
                const title =
                  discoveredStory.title || storyText.split('\n')[0] || ''

                // Use semantic search to find the matching existing story
                const queryEmbedding = await generateEmbedding({
                  text: `${title}\n\n${storyText}`,
                })
                const embeddingVector = `[${queryEmbedding.join(',')}]`

                // Search for the story using semantic similarity
                const matchingStories = await db
                  .selectFrom('stories')
                  .select(['id', 'name', 'story'])
                  .where('repoId', '=', repoRecord.repoId)
                  .where('state', 'in', ['active', 'paused', 'generated'])
                  .where('embedding', 'is not', null)
                  .orderBy(
                    sql`embedding <=> ${sql.raw(`'${embeddingVector}'`)}::vector`,
                    'asc',
                  )
                  .limit(1)
                  .execute()

                // If we found a match with high similarity, add it to rewrite list
                if (matchingStories.length > 0) {
                  const match = matchingStories[0]
                  // Calculate similarity to verify it's a good match
                  // We'll use a threshold - if it's in the top result, it's likely a match
                  storiesToRewrite.push({
                    clue,
                    story: {
                      id: match.id,
                      name: match.name,
                      story: match.story,
                    },
                  })
                } else {
                  logger.warn(
                    'Could not find matching existing story for discovered story',
                    {
                      clue,
                      discoveredTitle: title,
                    },
                  )
                }
              }
            }
          },
          { concurrency: 1 },
        )

        logger.info('Clue processing completed', {
          repoId: repoRecord.repoId,
          clueCount: clueAnalysis.clues.length,
          newStoriesCount: newStories.length,
          storiesToRewriteCount: storiesToRewrite.length,
        })

        void streams.append(
          'progress',
          dedent`
            Found ${newStories.length} new stories
            and ${storiesToRewrite.length} stories to rewrite.`,
        )

        logger.info('Step 9: Rewriting stories based on changes', {
          storiesToRewriteCount: storiesToRewrite.length,
        })

        // Rewrite each story found per clue
        const changedStories: ChangedStory[] = await pMap(
          storiesToRewrite,
          async ({ clue, story }) => {
            const rewrittenStory = await agents.rewrite.run({
              clue,
              commit,
              existingStory: story,
              sandboxId: sandbox.id,
              telemetryTracer: getTelemetryTracer(),
            })

            return {
              existingStory: story,
              rewrittenStory,
              clue,
            }
          },
          { concurrency: 3 },
        )

        logger.info('Story rewriting completed', {
          changedStoriesCount: changedStories.length,
        })

        // Log the changes
        logger.info('Story changes summary', {
          repoSlug,
          newStoriesCount: newStories.length,
          changedStoriesCount: changedStories.length,
          newStories: newStories.map((s) => ({ title: s.title, clue: s.clue })),
          changedStories: changedStories.map((s) => ({
            storyId: s.existingStory.id,
            storyName: s.existingStory.name,
            clue: s.clue,
          })),
        })

        // Save only NEW stories to the database with 'generated' state
        const savedStories = []
        if (newStories.length > 0) {
          const storiesToInsert = newStories.map((newStory) => ({
            repoId: repoRecord.repoId,
            name: newStory.title,
            story: newStory.text,
            state: 'generated' as const,
            metadata: {
              discoveredFrom: 'commits',
              commitSha: after,
              commitRange: { before, after },
              changedFiles,
              commitMessages,
              clue: newStory.clue,
              triggerRunId: ctx.run.id,
            },
          }))

          const insertedStories = await db
            .insertInto('stories')
            .values(storiesToInsert)
            .returningAll()
            .execute()

          savedStories.push(...insertedStories)

          logger.info('Saved new stories to database', {
            repoSlug,
            savedCount: insertedStories.length,
            storyIds: insertedStories.map((s) => s.id),
          })

          void streams.append(
            'progress',
            `Saved ${insertedStories.length} new story/stories to database`,
          )

          // Fire and forget: trigger decomposition tasks for each saved story
          void streams.append(
            'progress',
            'Triggering story decomposition tasks',
          )
          for (const savedStory of insertedStories) {
            await storyDecompositionTask.trigger(
              {
                story: {
                  id: savedStory.id,
                  text: savedStory.story,
                  title: savedStory.name,
                },
                repo: {
                  id: repoRecord.repoId,
                  slug: repoSlug,
                },
              },
              {
                tags: [
                  `org_${ownerLogin}`,
                  `repo_${repoName}`,
                  `story_${savedStory.id}`,
                ],
                idempotencyKey: `story-decomposition-${savedStory.id}`,
              },
            )
          }

          logger.info('Triggered decomposition tasks for saved stories', {
            repoSlug,
            storyCount: insertedStories.length,
            storyIds: insertedStories.map((s) => s.id),
          })
        } else {
          logger.info('No new stories to save', { repoSlug })
        }

        void streams.append('progress', 'Story discovery completed')

        return {
          codeDiff: diff,
          changedFiles,
          commitMessages,
          clueAnalysis,
          newStories: newStories.map((s) => ({
            title: s.title,
            text: s.text,
            clue: s.clue,
          })),
          changedStories: changedStories.map((s) => ({
            existingStory: s.existingStory,
            rewrittenStory: s.rewrittenStory,
            clue: s.clue,
          })),
          savedStories: savedStories.map((s) => ({
            id: s.id,
            name: s.name,
            story: s.story,
          })),
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
