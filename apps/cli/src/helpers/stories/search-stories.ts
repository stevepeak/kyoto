import { createDb, createIndex, query } from '@app/vectra'
import { findGitRoot } from '@app/shell'

import { pwdKyoto } from '../config/find-kyoto-dir'
import { generateEmbedding } from '../embeddings/generate-embedding'

interface StoryMetadata {
  filePath: string
  title: string
  behavior: string
  score?: number
}

interface SearchStoriesOptions {
  queryText: string
  topK?: number
  threshold?: number
}

/**
 * Gets or creates the vectra index for stories
 */
async function getStoriesIndex(): Promise<ReturnType<typeof createIndex>> {
  const gitRoot = await findGitRoot()
  const { vectra } = await pwdKyoto(gitRoot)
  const index = createIndex(vectra)
  await createDb(index)
  return index
}

/**
 * Searches for stories using semantic similarity
 */
export async function searchStories({
  queryText,
  topK = 10,
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
  }>(index, queryEmbedding, { topK, threshold })

  // Map results directly from metadata
  return results.map((result) => ({
    filePath: result.item.metadata.filePath,
    title: result.item.metadata.title,
    behavior: result.item.metadata.behavior,
    score: result.score,
  }))
}
