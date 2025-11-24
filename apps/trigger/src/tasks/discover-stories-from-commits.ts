import { task, logger, streams } from '@trigger.dev/sdk'
import { setupDb } from '@app/db'
import { getConfig } from '@app/config'
import { createDaytonaSandbox } from '../helpers/daytona'
import { getTelemetryTracer } from '@/telemetry'
import {
  agents,
  type StoryDiscoveryOutput,
  type StoryImpactOutput,
  extractScope,
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
import { diffLines } from 'diff'

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
  options: {
    maxScopeCount?: number
    runDecomposition?: boolean
    writeNewStories?: boolean
    rewriteStories?: boolean
  }
}

interface ChangedStory {
  existingStory: {
    id: string
    name: string
    story: string
  }
  rewrittenStory: string
  scope: string[]
}

interface NewStory {
  title: string
  text: string
  scope: string
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
- If no feature change scope found → exit

### 4. **Changelog Summary & Scope Extraction**
- Generates a changelog summary from commits and diff
- Extracts scope items (user-facing changes) from the changelog
- Returns a list of scope items (e.g., "Added user authentication", "Modified payment flow")

### 5. **Sandbox Creation**
- Creates a Daytona sandbox for code analysis context

### 6. **Impact Analysis & Story Discovery** (parallel processing)
For each scope (processed in parallel):
- Runs the impact agent to find existing stories that might be impacted
  - Uses both semantic search and keyword search tools
  - Returns story IDs with scope overlap assessment (significant/moderate/low)
- Collects all impacted stories per scope

After all scopes are processed:
- **Deduplicates stories**: Groups stories by ID since multiple scopes may find the same story
- **Maps story IDs to scopes**: Tracks which scopes found each story
- **Identifies scopes needing new stories**: Scopes with no impacted stories are marked for new story creation
- **Fetches story records**: Loads full story data from database for stories to rewrite

For scopes needing new stories (processed in parallel):
- Runs the discovery agent to create new stories from the scope
- Uses the scope, commit context, and code diff to generate stories
- Each new story is associated with its originating scope

### 7. **Story Rewriting** (parallel processing)
- For each impacted existing story, rewrites it based on:
  - All scopes that found it (joined together for context)
  - Code diff
  - Commit context
- Preserves original structure (Given/When/Then) for easier diffing
- Each rewritten story includes all scopes that identified it

### 8. **Save & Decompose**
- Saves only NEW stories to the database (state: `'generated'`)
- Triggers decomposition tasks for each new story
- Returns summary of new stories, rewritten stories, and metadata

## Key Design Decisions
- Filters to TypeScript/TSX files only
- Three-stage analysis: changelog summary, scope extraction, then story discovery
- Uses dual search strategy (semantic + keyword) to find impacted stories comprehensively
- Deduplicates stories across scopes to avoid redundant rewrites
- Groups multiple scopes per story to provide richer context during rewriting
- Preserves story structure when rewriting for easier diffs
- Only saves new stories; rewritten stories are returned but not auto-saved
- Parallel processing for both impact analysis and story creation to improve performance

The task returns early if there are no TypeScript changes or no feature scope, avoiding unnecessary work.

*/
export const discoverStoriesFromCommitsTask = task({
  id: 'discover-stories-from-commits',
  run: async (
    { repo, after, before, options }: DiscoverStoriesFromCommitsPayload,
    { ctx },
  ) => {
    const env = getConfig()
    const db = setupDb(env.DATABASE_URL)

    const { owner: ownerLogin, name: repoName } = repo
    const repoSlug = `${ownerLogin}/${repoName}`

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

      void streams.append(
        'progress',
        `Getting commit details for ${repoSlug} ${before.slice(0, 7)}...${after.slice(0, 7)}`,
      )

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

      // Generate changelog summary
      const changelog: string = await (
        agents.changelogSummary as {
          run: (options: {
            repoSlug: string
            commit: Commit
          }) => Promise<string>
        }
      ).run({
        repoSlug,
        commit: {
          message: commitMessages.join('\n\n'),
          diff,
          changedFiles,
        },
      })
      logger.info(changelog)

      // Extract scope from changelog
      const scopeItems: string[] = await extractScope({
        changelog,
        options: { maxScopeCount: options.maxScopeCount ?? 10 },
      })

      if (scopeItems.length === 0) {
        logger.warn('No scope items found, exiting', {
          changelog,
        })
        void streams.append(
          'progress',
          'No scope items found for feature changes, skipping story discovery',
        )
        return {
          skipped: true,
          reason: 'No scope items found for feature changes',
          scopeItems: [],
          changedFiles,
        }
      }

      logger.info('Extracted scope items', {
        scopeCount: scopeItems.length,
        scopeItems,
      })

      void streams.append('progress', 'Creating sandbox for code analysis')

      // Create sandbox
      const sandbox = await createDaytonaSandbox({
        repoId: repoRecord.repoId,
      })

      // Use the change log as the commit messages
      const commit: Commit = {
        message: changelog,
        diff,
        changedFiles,
      }

      try {
        void streams.append(
          'progress',
          `Found ${scopeItems.length} potential feature changes in scope`,
        )

        // Step 1: Collect all impacted stories per scope (parallel)
        const scopeToImpactedStories: Array<{
          scope: string
          impactedStories: StoryImpactOutput
        }> = await pMap(
          scopeItems,
          async (
            scope: string,
          ): Promise<{
            scope: string
            impactedStories: StoryImpactOutput
          }> => {
            const impactResult: StoryImpactOutput = await agents.impact.run({
              db,
              repo: {
                id: repoRecord.repoId,
                slug: repoSlug,
              },
              commit,
              options: {
                scope: [scope],
                telemetryTracer: getTelemetryTracer(),
              },
            })
            // Type guard: ensure we have a valid StoryImpactOutput
            return { scope, impactedStories: impactResult }
          },
          { concurrency: 1 },
        )

        console.log(`Found ${scopeToImpactedStories.length} impacted stories`, {
          stories: scopeToImpactedStories,
        })

        // Step 2: Dedupe and group: storyId -> scopes[]
        // Also identify scopes that need new stories
        const scopesNeedingNewStories: string[] = []
        const storyIdToScopes = new Map<string, string[]>()
        const allStoryIds = new Set<string>()

        for (const { scope, impactedStories } of scopeToImpactedStories) {
          if (impactedStories.stories.length === 0) {
            scopesNeedingNewStories.push(scope)
          } else {
            for (const { id: storyId } of impactedStories.stories) {
              allStoryIds.add(storyId)
              const existing = storyIdToScopes.get(storyId)
              if (existing) {
                if (!existing.includes(scope)) {
                  existing.push(scope)
                }
              } else {
                storyIdToScopes.set(storyId, [scope])
              }
            }
          }
        }

        // Step 3: Fetch story records from database for deduped stories
        const storiesToRewrite: Array<{
          story: {
            id: string
            name: string
            story: string
          }
          scopes: string[]
        }> = []

        if (allStoryIds.size > 0) {
          const storyRecords = await db
            .selectFrom('stories')
            .select(['id', 'name', 'story'])
            .where('id', 'in', Array.from(allStoryIds))
            .where('repoId', '=', repoRecord.repoId)
            .execute()

          const storyRecordsMap = new Map(storyRecords.map((r) => [r.id, r]))

          for (const [storyId, scopes] of storyIdToScopes.entries()) {
            const storyRecord = storyRecordsMap.get(storyId)
            if (storyRecord) {
              storiesToRewrite.push({
                story: {
                  id: storyRecord.id,
                  name: storyRecord.name,
                  story: storyRecord.story,
                },
                scopes,
              })
            } else {
              logger.warn(
                'Could not find story record for ID returned by impact agent',
                { storyId, scopes },
              )
            }
          }
        }

        // Step 4: Create new stories for scopes that need them
        const newStories: NewStory[] = []
        if (
          scopesNeedingNewStories.length > 0 &&
          // ? DEBUG to disable this functionality
          options.writeNewStories !== false
        ) {
          await pMap(
            scopesNeedingNewStories,
            async (scope: string) => {
              logger.info(
                'No impacted stories found for scope, creating new story',
                { scope },
              )

              void streams.append(
                'progress',
                `Creating new story for "${scope.substring(0, 30)}..."`,
              )

              const newStoryResult: StoryDiscoveryOutput =
                await agents.discovery.run({
                  db,
                  repo: {
                    id: repoRecord.repoId,
                    slug: repoSlug,
                  },
                  options: {
                    daytonaSandboxId: sandbox.id,
                    storyCount: 1,
                    telemetryTracer: getTelemetryTracer(),
                    context: {
                      scope: [scope],
                      commit,
                    },
                  },
                })

              logger.info('Created new story from scope', {
                scope,
                shouldBeOne: newStoryResult.stories.length,
                story: newStoryResult.stories[0],
              })

              for (const story of newStoryResult.stories) {
                newStories.push({
                  title:
                    story.title ||
                    story.text.split('\n')[0] ||
                    'Untitled Story',
                  text: story.text,
                  scope,
                })
              }
            },
            { concurrency: 1 },
          )
        }

        logger.info('Scope processing completed', {
          repoId: repoRecord.repoId,
          scopeCount: scopeItems.length,
          scopesNeedingNewStories: scopesNeedingNewStories.length,
          newStoriesCount: newStories.length,
          uniqueImpactedStoriesCount: storiesToRewrite.length,
          storiesToRewrite: storiesToRewrite.map((s) => ({
            storyName: s.story.name,
            scopes: s.scopes,
          })),
          totalImpactedStoryMatches: Array.from(
            storyIdToScopes.values(),
          ).reduce((sum, scopes) => sum + scopes.length, 0),
        })

        void streams.append(
          'progress',
          dedent`
            Found ${newStories.length} new stories
            and ${storiesToRewrite.length} stories to rewrite.`,
        )

        logger.info(
          `Rewriting ${storiesToRewrite.length} stories based on changes`,
          {
            storiesToRewrite,
          },
        )

        const shouldRewriteStories = options.rewriteStories !== false

        // Rewrite each story with all scopes that found it
        const changedStories: ChangedStory[] = shouldRewriteStories
          ? await pMap(
              storiesToRewrite,
              async ({ story, scopes }) => {
                const rewrittenStory = await agents.rewrite.run({
                  commit,
                  story: {
                    id: story.id,
                    name: story.name,
                    story: story.story,
                  },
                  options: {
                    scope: scopes,
                    sandboxId: sandbox.id,
                    telemetryTracer: getTelemetryTracer(),
                  },
                })

                return {
                  existingStory: story,
                  rewrittenStory,
                  scope: scopes,
                }
              },
              { concurrency: 3 },
            )
          : []

        // Log the changes for each story
        for (const changedStory of changedStories) {
          const patch = diffLines(
            changedStory.existingStory.story,
            changedStory.rewrittenStory,
          )

          let diffOutput = ''
          patch.forEach((part) => {
            const sign = part.added ? '+' : part.removed ? '-' : ' '
            diffOutput += sign + part.value
          })

          logger.log(diffOutput)
        }

        // Log the changes
        logger.info('Story changes summary', {
          newStoriesCount: newStories.length,
          changedStoriesCount: changedStories.length,
          newStories: newStories.map((s) => ({
            title: s.title,
            scope: s.scope,
          })),
          changedStories: changedStories.map((s) => ({
            storyId: s.existingStory.id,
            storyName: s.existingStory.name,
            scope: s.scope,
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
              scope: newStory.scope,
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
          if (options.runDecomposition !== false) {
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
          }
        } else {
          logger.info('No new stories to save', { repoSlug })
        }

        void streams.append('progress', 'Story discovery completed')

        return {
          codeDiff: diff,
          changedFiles,
          commitMessages,
          scopeItems,
          newStories: newStories.map((s) => ({
            title: s.title,
            text: s.text,
            scope: s.scope,
          })),
          changedStories: changedStories.map((s) => ({
            existingStory: s.existingStory,
            rewrittenStory: s.rewrittenStory,
            scope: s.scope,
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
