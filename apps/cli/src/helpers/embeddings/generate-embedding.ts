import OpenAI from 'openai'
import { getAiConfig } from '../config/get-ai-config.js'

interface GenerateEmbeddingOptions {
  /** The text to generate an embedding for */
  text: string
  /** Optional model ID, defaults to provider-specific embedding model */
  modelId?: string
}

/**
 * Generate an embedding vector using the configured AI provider.
 * Returns an array of numbers representing the embedding.
 */
export async function generateEmbedding({
  text,
}: GenerateEmbeddingOptions): Promise<number[]> {
  const aiConfig = await getAiConfig()

  if (!aiConfig) {
    throw new Error(
      'AI configuration not found. Run `kyoto init` to configure your AI provider.',
    )
  }

  switch (aiConfig.provider) {
    case 'openai':
    case 'vercel': // Vercel uses OpenAI under the hood
      const openai = new OpenAI({ apiKey: aiConfig.apiKey })
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      })
      return response.data[0]?.embedding ?? []

    case 'openrouter':
      // OpenRouter supports OpenAI-compatible embeddings
      // Use OpenAI client with OpenRouter API key
      const openrouterOpenai = new OpenAI({
        apiKey: aiConfig.apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
      })
      const openrouterResponse = await openrouterOpenai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      })
      return openrouterResponse.data[0]?.embedding ?? []

    default:
      throw new Error(`Unsupported provider: ${aiConfig.provider}`)
  }
}
