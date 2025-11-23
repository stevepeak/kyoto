import { tool } from 'ai'
import { z } from 'zod'
import { streams } from '@trigger.dev/sdk'
import { sql } from 'kysely'
import type { setupDb } from '@app/db'
import { generateEmbedding } from '../helpers/generate-embedding'

type DbClient = ReturnType<typeof setupDb>

const searchStoriesInputSchema = z.object({
  query: z
    .string()
    .describe(
      'A semantic search based on the description of what your looking for.',
    ),
  limit: z.number().int().positive().max(20).optional(),
})

/**
 * Search for existing stories for a repository
 * Supports both regular search (all stories) and semantic search (similar stories using embeddings)
 */
async function searchStoriesForRepo(
  db: DbClient,
  repoId: string,
  options: {
    query: string
    limit?: number
  },
) {
  const { query, limit } = options

  // Semantic search: use vector similarity
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding({ text: query })
  const embeddingVector = `[${queryEmbedding.join(',')}]`

  // Build query with cosine distance (<=> operator)
  // Lower distance = more similar, so we order by distance ascending
  let queryBuilder = db
    .selectFrom('stories')
    .select([
      'id',
      'name',
      'story',
      'decomposition',
      'state',
      // Calculate cosine distance as similarity score
      // pgvector's <=> operator returns cosine distance (0 = identical, 1 = orthogonal)
      sql<number>`(embedding <=> ${sql.raw(`'${embeddingVector}'`)}::vector)`.as(
        'similarity',
      ),
    ])
    .where('repoId', '=', repoId)
    .where('state', '!=', 'archived')
    .where('embedding', 'is not', null) // Only include stories with embeddings
    .orderBy('similarity', 'asc') // Lower distance = more similar
    .limit(limit ?? 20) // Default limit for semantic search

  const stories = await queryBuilder.execute()

  return stories
}

export function createSearchStoriesTool({
  db,
  repoId,
}: {
  db: DbClient
  repoId: string
}) {
  return tool({
    name: 'searchStories',
    description:
      'Search for existing stories for a repository. Returns stories that are not archived. Supports two modes: 1) Regular search: returns all non-archived stories (when no query provided). 2) Semantic search: returns stories similar to the query using vector embeddings (when query provided). Use this to avoid discovering duplicate stories and to compare new discoveries against existing ones.',
    inputSchema: searchStoriesInputSchema,
    execute: async ({ query, limit }) => {
      void streams.append('progress', `Searching for stories "${query}"`)

      const stories = await searchStoriesForRepo(db, repoId, { query, limit })

      return {
        stories,
      }
    },
  })
}
