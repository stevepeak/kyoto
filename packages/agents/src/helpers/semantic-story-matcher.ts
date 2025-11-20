import { parseEnv } from '@app/config'
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
  parts.push(`Title: ${story.name}`)

  // Add story content
  parts.push(`Story: ${story.story}`)

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
 * Create embeddings for stories using OpenAI
 */
async function createEmbeddings(
  texts: string[],
): Promise<number[][]> {
  const env = parseEnv()
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

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!
    normA += a[i]! * a[i]!
    normB += b[i]! * b[i]!
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
  private storyTexts: string[] = []

  constructor(stories: StoryForMatching[]) {
    this.stories = stories
  }

  /**
   * Initialize embeddings for all stories
   * Call this before using findSimilarStories
   */
  async initialize(): Promise<void> {
    logger.info('Initializing semantic story matcher', {
      storyCount: this.stories.length,
    })

    // Build text representations for all stories
    this.storyTexts = this.stories.map((story) => buildStoryText(story))

    // Create embeddings
    this.embeddings = await createEmbeddings(this.storyTexts)

    logger.info('Semantic story matcher initialized', {
      storyCount: this.stories.length,
      embeddingDimensions: this.embeddings[0]?.length || 0,
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
          this.embeddings![index]!,
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
  return matcher.findSimilarStories(queryStoryText, threshold, topK)
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
  return matcher.findMostSimilarStory(queryStoryText, threshold)
}
