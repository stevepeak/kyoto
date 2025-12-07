import { createIndex, ensureIndex, insert } from '@app/vectra'
import type { DiscoveredStory } from '@app/schemas'
import { pwdKyoto } from '../config/find-kyoto-dir.js'

interface SaveStoryEmbeddingOptions {
  filePath: string
  story: DiscoveredStory
  embedding: number[]
}

/**
 * Saves a single story embedding to the vectra database
 */
export async function saveStoryEmbedding({
  filePath,
  story,
  embedding,
}: SaveStoryEmbeddingOptions): Promise<void> {
  const { vectra } = await pwdKyoto()
  const index = createIndex(vectra)
  await ensureIndex(index)

  // Create a unique ID from the file path (normalized)
  const storyId = filePath.replace(/[^\dA-Za-z]/g, '_')

  try {
    // Check if story already exists in index
    const existing = await index.getItem(storyId)
    if (existing) {
      // Story already indexed, skip
      return
    }

    // Insert story into vectra database
    await insert(index, {
      id: storyId,
      vector: embedding,
      metadata: {
        filePath,
        title: story.title,
        behavior: story.behavior,
      },
    })
  } catch (error) {
    // Log error but don't fail the entire process
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    throw new Error(
      `Failed to save story ${story.title} to vectra database: ${errorMessage}`,
    )
  }
}
