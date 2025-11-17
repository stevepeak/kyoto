import { task, logger } from '@trigger.dev/sdk'

import { setupDb } from '@app/db'
import { agents } from '@app/agents'
import { parseEnv } from '@app/config'
import { createDaytonaSandbox } from '../helpers/daytona'
import { getTelemetryTracer } from '@/telemetry'
import type { StoryDiscoveryOutput } from '@app/agents'
import { findRepoByOwnerAndName } from './github/shared/db'

interface DiscoverStoriesPayload {
  /** Repository slug in format {owner}/{repo} */
  repoSlug: string
  /** Number of stories to discover */
  storyCount: number
}

export const discoverStoriesTask = task({
  id: 'discover-stories',
  run: async ({
    repoSlug,
    storyCount,
  }: DiscoverStoriesPayload): Promise<StoryDiscoveryOutput> => {
    const env = parseEnv()
    const db = setupDb(env.DATABASE_URL)

    // Parse repo slug to get owner and repo name
    const [ownerLogin, repoName] = repoSlug.split('/')
    if (!ownerLogin || !repoName) {
      throw new Error(
        `Invalid repo slug format: ${repoSlug}. Expected format: owner/repo`,
      )
    }

    // Find the repository in the database
    const repoRecord = await findRepoByOwnerAndName(db, {
      ownerLogin,
      repoName,
    })

    if (!repoRecord) {
      throw new Error(
        `Repository ${repoSlug} not found in database. Make sure the repository is installed and enabled.`,
      )
    }

    logger.info(`Discovering ${storyCount} stories for ${repoSlug}`, {
      repoId: repoRecord.repoId,
      storyCount,
    })

    // Retrieve existing story titles for this repo to avoid duplicates
    const existingStories = await db
      .selectFrom('stories')
      .select(['name'])
      .where('repoId', '=', repoRecord.repoId)
      .where('state', '!=', 'archived')
      .execute()

    const existingStoryTitles = existingStories.map((story) => story.name)

    logger.info(`Found ${existingStoryTitles.length} existing stories to avoid`, {
      repoId: repoRecord.repoId,
      existingTitles: existingStoryTitles,
    })

    // Create the sandbox and clone the repository
    const sandbox = await createDaytonaSandbox({ repoId: repoRecord.repoId })

    try {
      // Run the story discovery agent
      const discoveryResult = await agents.discovery.run({
        repo: {
          id: repoRecord.repoId,
          slug: repoSlug,
        },
        options: {
          daytonaSandboxId: sandbox.id,
          storyCount,
          telemetryTracer: getTelemetryTracer(),
          model: agents.discovery.options.model,
          existingStoryTitles,
        },
      })

      logger.info('Story discovery completed', {
        repoSlug,
        storiesFound: discoveryResult.stories.length,
      })

      // Return the discovered stories
      return discoveryResult
    } catch (error) {
      logger.error('Story discovery failed', {
        repoSlug,
        storyCount,
        error,
      })
      throw error
    } finally {
      await sandbox.delete()
    }
  },
})
