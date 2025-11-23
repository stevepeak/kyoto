import { getConfig } from '@app/config'
import type { DecompositionOutput } from '@app/schemas'
import { logger } from '@trigger.dev/sdk'
import OpenAI from 'openai'

/**
 * Story data structure for semantic matching
 */
export interface StoryForMatching {
  id: string
  name: string
  story: string
  decomposition: DecompositionOutput | null
  /**
   * Optional embedding vector from the database.
   * If provided, will be used instead of generating a new embedding.
   * Format: '[1,2,3]' (pgvector string format)
   */
  embedding?: string | null
}

/**
 * Result of semantic story matching
 */
export interface SemanticMatchResult {
  story: StoryForMatching
  similarity: number
}

/**
 * Build a combined text representation of a story for embedding
 * Combines: title + story content + givens + assertions
 */
function buildStoryText(story: StoryForMatching): string {
  const parts: string[] = []

  // Add title
  parts.push(`Title: ${story.name}`, `Story: ${story.story}`)

  // Add decomposition details if available
  if (story.decomposition?.steps) {
    const givens: string[] = []
    const goals: string[] = []
    const assertions: string[] = []

    for (const step of story.decomposition.steps) {
      if (step.type === 'given') {
        givens.push(step.given)
      } else if (step.type === 'requirement') {
        goals.push(step.goal)
        assertions.push(...step.assertions)
      }
    }

    if (givens.length > 0) {
      parts.push(`Givens: ${givens.join('; ')}`)
    }

    if (goals.length > 0) {
      parts.push(`Goals: ${goals.join('; ')}`)
    }

    if (assertions.length > 0) {
      parts.push(`Assertions: ${assertions.join('; ')}`)
    }
  }

  return parts.join('\n\n')
}

/**
 * Parse embedding string from database (pgvector format) to number array
 * Format: '[1,2,3]' -> [1, 2, 3]
 */
function parseEmbedding(
  embeddingString: string | null | undefined,
): number[] | null {
  if (!embeddingString) {
    return null
  }

  try {
    // Remove brackets and split by comma, then parse as numbers
    const cleaned = embeddingString.trim()
    if (!cleaned.startsWith('[') || !cleaned.endsWith(']')) {
      logger.warn('Invalid embedding format, expected [1,2,3]', {
        embedding: embeddingString.substring(0, 50),
      })
      return null
    }

    const numbers = cleaned
      .slice(1, -1) // Remove brackets
      .split(',')
      .map((s) => Number.parseFloat(s.trim()))
      .filter((n) => !Number.isNaN(n))

    return numbers.length > 0 ? numbers : null
  } catch (error) {
    logger.warn('Failed to parse embedding', {
      error,
      embedding: embeddingString.substring(0, 50),
    })
    return null
  }
}

/**
 * Create embeddings for stories using OpenAI
 */
async function createEmbeddings(texts: string[]): Promise<number[][]> {
  const env = getConfig()
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY })

  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  })

  return response.data.map((item) => item.embedding)
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (const [i, element] of a.entries()) {
    dotProduct += element * b[i]
    normA += element * element
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) {
    return 0
  }

  return dotProduct / denominator
}

/**
 * Semantic story matcher - finds similar stories using embeddings
 * This function is well-isolated and reusable
 */
export class SemanticStoryMatcher {
  private stories: StoryForMatching[]
  private embeddings: number[][] | null = null

  constructor(stories: StoryForMatching[]) {
    this.stories = stories
  }

  /**
   * Initialize embeddings for all stories
   * Uses existing embeddings from database when available, generates new ones only when needed
   * Call this before using findSimilarStories
   */
  async initialize(): Promise<void> {
    logger.info('Initializing semantic story matcher', {
      storyCount: this.stories.length,
    })

    // Parse existing embeddings from database
    const existingEmbeddings: (number[] | null)[] = this.stories.map((story) =>
      parseEmbedding(story.embedding),
    )

    // Identify stories that need new embeddings
    const storiesNeedingEmbeddings: {
      index: number
      story: StoryForMatching
      text: string
    }[] = []

    for (let i = 0; i < this.stories.length; i++) {
      const story = this.stories[i]
      if (!existingEmbeddings[i]) {
        // Build text representation for stories without embeddings
        const text = buildStoryText(story)
        storiesNeedingEmbeddings.push({
          index: i,
          story,
          text,
        })
      }
    }

    logger.info('Processing embeddings', {
      totalStories: this.stories.length,
      withExistingEmbeddings: existingEmbeddings.filter((e) => e !== null)
        .length,
      needingNewEmbeddings: storiesNeedingEmbeddings.length,
    })

    // Generate embeddings only for stories that don't have them
    let newEmbeddings: number[][] = []
    if (storiesNeedingEmbeddings.length > 0) {
      const textsToEmbed = storiesNeedingEmbeddings.map((item) => item.text)
      newEmbeddings = await createEmbeddings(textsToEmbed)
    }

    // Combine existing and new embeddings in the correct order
    this.embeddings = []
    let newEmbeddingIndex = 0
    for (let i = 0; i < this.stories.length; i++) {
      const existing = existingEmbeddings[i]
      if (existing) {
        this.embeddings.push(existing)
      } else {
        // Use newly generated embedding
        const newEmbedding = newEmbeddings[newEmbeddingIndex]
        if (newEmbedding) {
          this.embeddings.push(newEmbedding)
          newEmbeddingIndex++
        } else {
          logger.error('Missing embedding for story', {
            storyId: this.stories[i]?.id,
            index: i,
          })
          throw new Error(
            `Failed to generate embedding for story at index ${i}`,
          )
        }
      }
    }

    logger.info('Semantic story matcher initialized', {
      storyCount: this.stories.length,
      embeddingDimensions: this.embeddings[0]?.length || 0,
      usedExistingEmbeddings: existingEmbeddings.filter((e) => e !== null)
        .length,
      generatedNewEmbeddings: newEmbeddings.length,
    })
  }

  /**
   * Find similar stories to a given story text
   * @param queryStoryText - The story text to find similar stories for
   * @param threshold - Minimum similarity threshold (0-1), default 0.7
   * @param topK - Maximum number of results to return, default 5
   * @returns Array of similar stories sorted by similarity (highest first)
   */
  async findSimilarStories(
    queryStoryText: string,
    threshold: number = 0.7,
    topK: number = 5,
  ): Promise<SemanticMatchResult[]> {
    if (!this.embeddings) {
      throw new Error(
        'SemanticStoryMatcher not initialized. Call initialize() first.',
      )
    }

    logger.info('Finding similar stories', {
      queryLength: queryStoryText.length,
      threshold,
      topK,
    })

    // Create embedding for query story
    const [queryEmbedding] = await createEmbeddings([queryStoryText])

    // Calculate similarities
    const similarities: SemanticMatchResult[] = this.stories.map(
      (story, index) => {
        const similarity = cosineSimilarity(
          queryEmbedding,
          this.embeddings![index],
        )
        return {
          story,
          similarity,
        }
      },
    )

    // Filter by threshold and sort by similarity
    const filtered = similarities
      .filter((result) => result.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)

    logger.info('Found similar stories', {
      totalStories: this.stories.length,
      matchesAboveThreshold: filtered.length,
      topSimilarity: filtered[0]?.similarity || 0,
    })

    return filtered
  }

  /**
   * Find the most similar story to a given story text
   * @param queryStoryText - The story text to find a match for
   * @param threshold - Minimum similarity threshold (0-1), default 0.7
   * @returns The most similar story or null if none above threshold
   */
  async findMostSimilarStory(
    queryStoryText: string,
    threshold: number = 0.7,
  ): Promise<SemanticMatchResult | null> {
    const results = await this.findSimilarStories(queryStoryText, threshold, 1)
    return results[0] || null
  }
}

/**
 * Convenience function to create a matcher and find similar stories in one call
 * Useful when you have stories loaded and want to find matches quickly
 */
export async function findSimilarStories(
  existingStories: StoryForMatching[],
  queryStoryText: string,
  threshold: number = 0.7,
  topK: number = 5,
): Promise<SemanticMatchResult[]> {
  const matcher = new SemanticStoryMatcher(existingStories)
  await matcher.initialize()
  return await matcher.findSimilarStories(queryStoryText, threshold, topK)
}

/**
 * Convenience function to find the most similar story
 */
export async function findMostSimilarStory(
  existingStories: StoryForMatching[],
  queryStoryText: string,
  threshold: number = 0.7,
): Promise<SemanticMatchResult | null> {
  const matcher = new SemanticStoryMatcher(existingStories)
  await matcher.initialize()
  return await matcher.findMostSimilarStory(queryStoryText, threshold)
}
