import { task, logger, streams } from '@trigger.dev/sdk'

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
  /** Whether to save stories to the database. Defaults to false. */
  save?: boolean
}

export const discoverStoriesTask = task({
  id: 'discover-stories',
  run: async ({
    repoSlug,
    storyCount,
    save = false,
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

    // Insert placeholder stories with 'generated' state before discovery (only if saving)
    const placeholderStories = save
      ? await db
          .insertInto('stories')
          .values(
            Array.from({ length: storyCount }, (_, i) => ({
              repoId: repoRecord.repoId,
              name: `Story ${i + 1}`,
              story: 'Generating story...',
              state: 'generated',
            })),
          )
          .returningAll()
          .execute()
      : []

    if (save) {
      logger.info(`Created ${placeholderStories.length} placeholder stories`, {
        repoId: repoRecord.repoId,
        storyIds: placeholderStories.map((s) => s.id),
      })
    }

    // Create the sandbox and clone the repository
    const sandbox = await createDaytonaSandbox({ repoId: repoRecord.repoId })

    try {
      // Emit "starting agent" message
      void streams.append('progress', 'Starting story discovery')

      // Run the story discovery agent
      const discoveryResult = await agents.discovery.run({
        db,
        repo: {
          id: repoRecord.repoId,
          slug: repoSlug,
        },
        options: {
          daytonaSandboxId: sandbox.id,
          storyCount,
          telemetryTracer: getTelemetryTracer(),
          model: agents.discovery.options.model,
        },
      })

      logger.info('Story discovery completed', {
        repoSlug,
        storiesFound: discoveryResult.stories.length,
      })

      if (save) {
        void streams.append('progress', 'Updating stories')

        // Update placeholder stories with discovered content
        const storiesToUpdate = discoveryResult.stories.slice(
          0,
          placeholderStories.length,
        )

        for (const [i, discoveredStory] of storiesToUpdate.entries()) {
          const placeholder = placeholderStories[i]

          await db
            .updateTable('stories')
            .set({
              name: discoveredStory.title || `Story ${i + 1}`,
              story: discoveredStory.text,
              state: 'generated',
            })
            .where('id', '=', placeholder.id)
            .execute()

          logger.info('Updated placeholder story with discovered content', {
            storyId: placeholder.id,
            title: discoveredStory.title,
          })
        }

        // Delete extra placeholder stories if fewer stories were discovered
        if (discoveryResult.stories.length < placeholderStories.length) {
          const extraPlaceholders = placeholderStories.slice(
            discoveryResult.stories.length,
          )
          const extraIds = extraPlaceholders.map((p) => p.id)

          await db.deleteFrom('stories').where('id', 'in', extraIds).execute()

          logger.info('Deleted extra placeholder stories', {
            deletedCount: extraPlaceholders.length,
            deletedIds: extraIds,
          })
        }
      }

      // Return the discovered stories
      return discoveryResult
    } catch (error) {
      logger.error('Story discovery failed', {
        repoSlug,
        storyCount,
        error,
      })

      // On error, delete placeholder stories to avoid leaving orphaned records (only if saving)
      if (save) {
        const placeholderIds = placeholderStories.map((s) => s.id)
        await db
          .deleteFrom('stories')
          .where('id', 'in', placeholderIds)
          .execute()
          .catch((deleteError) => {
            logger.error('Failed to clean up placeholder stories after error', {
              error: deleteError,
              placeholderIds,
            })
          })
      }

      throw error
    } finally {
      await sandbox.delete()
    }
  },
})
