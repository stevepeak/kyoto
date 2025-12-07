import { createIndex, ensureIndex, insert } from '@app/vectra'
import type { DiscoveryAgentOutput } from '@app/schemas'
import { pwdKyoto } from '../config/find-kyoto-dir.js'

interface InsertStoryEmbeddingsOptions {
  stories: DiscoveryAgentOutput
  writtenFiles: string[]
}

/**
 * Adds stories to the vectra database for semantic search
 */
export async function insertStoryEmbeddings({
  stories,
  writtenFiles,
}: InsertStoryEmbeddingsOptions): Promise<void> {
  const { vectra } = await pwdKyoto()
  const index = createIndex(vectra)
  await ensureIndex(index)

  for (const [i, story] of stories.entries()) {
    const filePath = writtenFiles[i]

    if (!story.embeddings || story.embeddings.length === 0) {
      // Skip stories without embeddings
      continue
    }

    // Create a unique ID from the file path (normalized)
    const storyId = filePath.replace(/[^\dA-Za-z]/g, '_')

    try {
      // Check if story already exists in index
      const existing = await index.getItem(storyId)
      if (existing) {
        // Story already indexed, skip
        continue
      }

      // Insert story into vectra database
      await insert(index, {
        id: storyId,
        vector: story.embeddings,
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
      console.error(
        `Failed to add story ${story.title} to vectra database:`,
        errorMessage,
      )
    }
  }
}
