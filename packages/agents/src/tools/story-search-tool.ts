import { logger } from '@trigger.dev/sdk'
import { tool } from 'ai'
import { z } from 'zod'

import { setupDb } from '@app/db'
import { parseEnv } from '@app/config'

const searchStoriesInputSchema = z.object({
  query: z
    .string()
    .min(2)
    .max(256)
    .describe(
      'Keywords or partial phrases to search existing stories for this repository',
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5)
    .describe('Maximum number of stories to return')
    .optional(),
})

export function createStorySearchTool({ repoId }: { repoId: string }) {
  return tool({
    name: 'searchStories',
    description:
      'Search existing stored user stories for this repository to understand prior coverage and avoid duplicates.',
    inputSchema: searchStoriesInputSchema,
    execute: async ({ query, limit = 5 }) => {
      const env = parseEnv()
      const db = setupDb(env.DATABASE_URL)

      const escapedQuery = query.replace(/[%_]/g, '\\$&')
      const pattern = `%${escapedQuery}%`

      try {
        const results = await db
          .selectFrom('stories')
          .select(['id', 'name', 'story', 'state', 'updatedAt'])
          .where('repoId', '=', repoId)
          .where('state', '!=', 'archived')
          .where((eb) =>
            eb.or([
              eb('stories.name', 'ilike', pattern),
              eb('stories.story', 'ilike', pattern),
            ]),
          )
          .orderBy('updatedAt', 'desc')
          .limit(limit)
          .execute()

        logger.debug('🔎 Story search results', {
          repoId,
          query,
          limit,
          count: results.length,
        })

        if (results.length === 0) {
          return JSON.stringify(
            {
              message: 'No matching stories found.',
              query,
            },
            null,
            2,
          )
        }

        return JSON.stringify(
          results.map((story) => ({
            id: story.id,
            title: story.name,
            state: story.state,
            updatedAt: story.updatedAt,
            text: story.story,
          })),
          null,
          2,
        )
      } finally {
        await db.destroy()
      }
    },
  })
}
