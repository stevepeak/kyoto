import { createDb, createIndex, query } from '@app/vectra'
import { tool } from 'ai'
import { z } from 'zod'

import { pwdKyoto } from '../config/find-kyoto-dir'
import { generateEmbedding } from '../embeddings/generate-embedding'

const searchStoriesInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(500)
    .describe(
      'Search query to find relevant stories using semantic similarity. Can be keywords, phrases, or natural language descriptions.',
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(10)
    .describe('Maximum number of stories to return'),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe(
      'Minimum similarity score threshold (0-1). Results below this score will be filtered out.',
    ),
})

interface StoryMetadata {
  filePath: string
  title: string
  behavior: string
}

/**
 * Gets or creates the vectra index for stories
 */
async function getStoriesIndex(): Promise<ReturnType<typeof createIndex>> {
  const { vectra } = await pwdKyoto()
  const index = createIndex(vectra)
  await createDb(index)
  return index
}

interface SearchStoriesOptions {
  queryText: string
  limit: number
  threshold?: number
}

/**
 * Searches for stories using semantic similarity
 */
async function searchStories({
  queryText,
  limit,
  threshold,
}: SearchStoriesOptions): Promise<StoryMetadata[]> {
  const index = await getStoriesIndex()

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding({ text: queryText })

  // Query the index - metadata already contains filePath, title, behavior
  const results = await query<{
    filePath: string
    title: string
    behavior: string
  }>(index, queryEmbedding, { topK: limit, threshold })

  // Map results directly from metadata
  return results.map((result) => ({
    filePath: result.item.metadata.filePath,
    title: result.item.metadata.title,
    behavior: result.item.metadata.behavior,
  }))
}

export function createSearchStoriesTool(
  args: {
    logger?: (message: string) => void
  } = {},
) {
  return tool({
    name: 'searchStories',
    description: 'Semantic search for user stories.',
    inputSchema: searchStoriesInputSchema,
    execute: async (input: z.infer<typeof searchStoriesInputSchema>) => {
      try {
        const results = await searchStories({
          queryText: input.query,
          limit: input.limit || 3,
          threshold: input.threshold ?? 0.75,
        })

        if (args.logger) {
          args.logger(`Searching "${input.query}"`)
        }

        if (results.length === 0) {
          return JSON.stringify({
            message: 'No stories found matching the query',
            results: [],
          })
        }

        return JSON.stringify(
          {
            count: results.length,
            results: results.map((r) => ({
              filePath: r.filePath,
              title: r.title,
              behavior: r.behavior,
            })),
          },
          null,
          2,
        )
      } catch (error) {
        return JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Failed to search stories',
          results: [],
        })
      }
    },
  })
}
