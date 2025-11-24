import { tool } from 'ai'
import { z } from 'zod'
import { streams } from '@trigger.dev/sdk'
import { sql } from 'kysely'
import type { setupDb } from '@app/db'

type DbClient = ReturnType<typeof setupDb>

const keywordSearchStoriesInputSchema = z.object({
  keywords: z
    .string()
    .describe(
      'Keywords or phrases to search for in story names, story text, and decomposition. Can be multiple words separated by spaces.',
    ),
  limit: z.number().int().positive().max(20).optional(),
})

/**
 * Search for existing stories using keyword/full-text search
 * Searches across story name, story text, and decomposition JSONB
 */
async function keywordSearchStoriesForRepo(
  db: DbClient,
  repoId: string,
  options: {
    keywords: string
    limit?: number
  },
) {
  const { keywords, limit } = options

  // Use PostgreSQL full-text search
  // Search across: name, story text, and decomposition (cast to text)
  const searchTerms = keywords.trim()

  // Escape single quotes for SQL safety
  const escapedSearchTerms = searchTerms.replace(/'/g, "''")

  // Build full-text search query
  // We'll search in name, story, and decomposition::text
  const queryBuilder = db
    .selectFrom('stories')
    .select([
      'id',
      'name',
      'story',
      'decomposition',
      'state',
      // Calculate text search rank
      sql<number>`ts_rank(
        to_tsvector('english', coalesce(name, '') || ' ' || coalesce(story, '') || ' ' || coalesce(decomposition::text, '')),
        plainto_tsquery('english', ${sql.lit(escapedSearchTerms)})
      )`.as('rank'),
    ])
    .where('repoId', '=', repoId)
    .where('state', '!=', 'archived')
    .where(
      sql<boolean>`to_tsvector('english', coalesce(name, '') || ' ' || coalesce(story, '') || ' ' || coalesce(decomposition::text, '')) @@ plainto_tsquery('english', ${sql.lit(escapedSearchTerms)})`,
    )
    .orderBy('rank', 'desc')
    .limit(limit ?? 20)

  const stories = await queryBuilder.execute()

  return stories
}

export function createKeywordSearchStoriesTool({
  db,
  repoId,
}: {
  db: DbClient
  repoId: string
}) {
  return tool({
    name: 'keywordSearchStories',
    description:
      'Search for existing stories using keyword/full-text search. Searches across story names, story text, and decomposition content. Use this when you have specific keywords or phrases to look for. Returns stories that are not archived.',
    inputSchema: keywordSearchStoriesInputSchema,
    execute: async ({ keywords, limit }) => {
      const stories = await keywordSearchStoriesForRepo(db, repoId, {
        keywords,
        limit,
      })
      console.log(`Semantic search for stories`, {
        keywords,
        found: `${stories.length}, with limit ${limit ?? 20} found`,
        stories: stories.map((s) => s.name),
      })
      return {
        stories,
      }
    },
  })
}
