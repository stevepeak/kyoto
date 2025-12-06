import OpenAI from 'openai'
import { getConfig } from '@app/config'
import type { Story } from './story-generator-agent.js'
import type { StoryFile } from './story-file-reader.js'

/**
 * Generate an embedding vector using OpenAI's embeddings API.
 * Implemented directly here to avoid loading the entire @app/agents package
 * during command discovery (which causes module resolution issues).
 */
async function generateEmbedding({
  text,
  modelId = 'text-embedding-3-small',
}: {
  text: string
  modelId?: string
}): Promise<number[]> {
  const { OPENAI_API_KEY } = getConfig()
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

  const response = await openai.embeddings.create({
    model: modelId,
    input: text,
  })

  return response.data[0]?.embedding ?? []
}

/**
 * Computes cosine similarity between two embedding vectors.
 * Returns a value between 0 and 1, where 1 means identical.
 */
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length')
  }

  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i]! * vec2[i]!
    norm1 += vec1[i]! * vec1[i]!
    norm2 += vec2[i]! * vec2[i]!
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2)
  if (denominator === 0) {
    return 0
  }

  return dotProduct / denominator
}

/**
 * Combines story fields into a single text string for embedding generation.
 */
function storyToText(story: Story): string {
  const parts: string[] = [story.title, story.behavior]

  if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
    parts.push(story.acceptanceCriteria.join('\n'))
  }

  return parts.join('\n')
}

/**
 * Computes semantic similarity between two stories using embeddings.
 * Returns a similarity score between 0 and 1, where 1 means identical.
 *
 * @param story1 - First story to compare
 * @param story2 - Second story to compare
 * @returns Similarity score (0-1)
 */
export async function computeStorySimilarity(
  story1: Story,
  story2: Story,
): Promise<number> {
  const text1 = storyToText(story1)
  const text2 = storyToText(story2)

  // Generate embeddings for both stories
  const [embedding1, embedding2] = await Promise.all([
    generateEmbedding({ text: text1 }),
    generateEmbedding({ text: text2 }),
  ])

  // Compute cosine similarity
  return cosineSimilarity(embedding1, embedding2)
}

/**
 * Groups stories into duplicate clusters based on similarity threshold.
 * Uses a union-find approach to group similar stories.
 *
 * @param stories - Array of story files to group
 * @param threshold - Minimum similarity score to consider stories duplicates (0-1)
 * @returns Array of duplicate groups (each group is an array of StoryFile)
 */
export async function groupDuplicates(
  stories: StoryFile[],
  threshold: number,
  onProgress?: (message: string) => void,
): Promise<Array<StoryFile[]>> {
  if (stories.length === 0) {
    return []
  }

  // Union-find data structure
  const parent = new Map<number, number>()
  const rank = new Map<number, number>()

  function find(x: number): number {
    if (!parent.has(x)) {
      parent.set(x, x)
      rank.set(x, 0)
      return x
    }
    if (parent.get(x) !== x) {
      parent.set(x, find(parent.get(x)!))
    }
    return parent.get(x)!
  }

  function union(x: number, y: number): void {
    const rootX = find(x)
    const rootY = find(y)

    if (rootX === rootY) {
      return
    }

    const rankX = rank.get(rootX) ?? 0
    const rankY = rank.get(rootY) ?? 0

    if (rankX < rankY) {
      parent.set(rootX, rootY)
    } else if (rankX > rankY) {
      parent.set(rootY, rootX)
    } else {
      parent.set(rootY, rootX)
      rank.set(rootX, rankX + 1)
    }
  }

  // Compare all pairs of stories
  const totalComparisons = (stories.length * (stories.length - 1)) / 2
  let completedComparisons = 0

  for (let i = 0; i < stories.length; i++) {
    for (let j = i + 1; j < stories.length; j++) {
      try {
        const similarity = await computeStorySimilarity(
          stories[i]!.story,
          stories[j]!.story,
        )

        if (similarity >= threshold) {
          union(i, j)
        }

        completedComparisons++
        if (onProgress) {
          onProgress(
            `Comparing stories: ${completedComparisons}/${totalComparisons} (${Math.round((completedComparisons / totalComparisons) * 100)}%)`,
          )
        }
      } catch (error) {
        // Skip comparison if embedding generation fails
        completedComparisons++
        continue
      }
    }
  }

  // Group stories by their root parent
  const groups = new Map<number, StoryFile[]>()

  for (let i = 0; i < stories.length; i++) {
    const root = find(i)
    if (!groups.has(root)) {
      groups.set(root, [])
    }
    groups.get(root)!.push(stories[i]!)
  }

  // Return only groups with more than one story (actual duplicates)
  return Array.from(groups.values()).filter((group) => group.length > 1)
}
