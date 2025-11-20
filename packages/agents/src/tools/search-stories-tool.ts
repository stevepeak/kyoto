import { tool } from 'ai'
import { z } from 'zod'
import { setupDb } from '@app/db'
import { parseEnv } from '@app/config'
import { logger } from '@trigger.dev/sdk'

const searchStoriesInputSchema = z.object({
  repoId: z
    .string()
    .uuid()
    .describe('The repository ID to search for stories'),
})

export interface StorySearchResult {
  id: string
  name: string
  story: string
  decomposition: unknown | null
  state: string
}

/**
 * Search for existing stories for a repository
 */
export async function searchStoriesForRepo(
  repoId: string,
): Promise<StorySearchResult[]> {
  const env = parseEnv()
  const db = setupDb(env.DATABASE_URL)

  try {
    const stories = await db
      .selectFrom('stories')
      .select([
        'id',
        'name',
        'story',
        'decomposition',
        'state',
      ])
      .where('repoId', '=', repoId)
      .where('state', '!=', 'archived')
      .orderBy('createdAt', 'desc')
      .execute()

    logger.debug('Found stories for repo', {
      repoId,
      count: stories.length,
    })

    return stories.map((story) => ({
      id: story.id,
      name: story.name,
      story: story.story,
      decomposition: story.decomposition,
      state: story.state,
    }))
  } catch (error) {
    logger.error('Failed to search stories', { repoId, error })
    throw error
  } finally {
    await db.destroy()
  }
}

export function createSearchStoriesTool() {
  return tool({
    name: 'searchStories',
    description:
      'Search for existing stories for a repository. Returns stories that are not archived. Use this to avoid discovering duplicate stories and to compare new discoveries against existing ones.',
    inputSchema: searchStoriesInputSchema,
    execute: async (input) => {
      logger.info('Searching stories for repo', { repoId: input.repoId })
      const stories = await searchStoriesForRepo(input.repoId)
      return {
        stories,
        count: stories.length,
      }
    },
  })
}
