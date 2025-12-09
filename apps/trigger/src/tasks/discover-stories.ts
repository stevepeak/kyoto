import { agents } from '@app/agents'
import { getConfig } from '@app/config'
import { createDb, eq, inArray, schema } from '@app/db'
import * as Sentry from '@sentry/node'
import { logger, streams, task } from '@trigger.dev/sdk'

import { createDaytonaSandbox } from '../helpers/daytona'
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
  }: DiscoverStoriesPayload) => {
    const env = getConfig()
    const db = createDb({ databaseUrl: env.DATABASE_URL })

    Sentry.setUser({ name: repoSlug })

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
          .insert(schema.stories)
          .values(
            Array.from({ length: storyCount }, (_, i) => ({
              repoId: repoRecord.repoId,
              name: `Story ${i + 1}`,
              story: 'Generating story...',
              state: 'generated' as const,
            })),
          )
          .returning()
      : []

    if (save) {
      logger.info(`Created ${placeholderStories.length} placeholder stories`, {
        repoId: repoRecord.repoId,
        storyIds: placeholderStories.map((s: { id: string }) => s.id),
      })
    }

    // Create the sandbox and clone the repository
    const sandbox = await createDaytonaSandbox({ repoId: repoRecord.repoId })

    try {
      // Emit "starting agent" message
      void streams.append('progress', 'Starting story discovery')

      // Run the story discovery agent
      const kyotoDiscoverCLIOutput = await sandbox.process.executeCommand(
        'kyoto discover --json', // TODO instead get a list of created stories, read them using
        `workspace/repo`,
      )
      // TODO sandbox.fs.downloadFile()

      const discoveryResult = agents.discovery.schema.parse(
        kyotoDiscoverCLIOutput.result,
      )

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
            .update(schema.stories)
            .set({
              name: discoveredStory.title || `Story ${i + 1}`,
              story: discoveredStory.text,
              state: 'generated',
            })
            .where(eq(schema.stories.id, placeholder.id))

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
          const extraIds = extraPlaceholders.map((p: { id: string }) => p.id)

          await db
            .delete(schema.stories)
            .where(inArray(schema.stories.id, extraIds))

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
        const placeholderIds = placeholderStories.map(
          (s: { id: string }) => s.id,
        )
        await db
          .delete(schema.stories)
          .where(inArray(schema.stories.id, placeholderIds))
          .catch((deleteError: unknown) => {
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
