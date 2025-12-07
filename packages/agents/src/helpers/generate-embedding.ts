import { getConfig } from '@app/config'
import OpenAI from 'openai'

interface GenerateEmbeddingOptions {
  /** The text to generate an embedding for */
  text: string
  /** Optional model ID, defaults to 'text-embedding-3-small' */
  modelId?: string
}

/**
 * Generate an embedding vector using OpenAI's embeddings API.
 * Returns an array of numbers representing the embedding.
 */
export async function generateEmbedding({
  text,
  modelId = 'text-embedding-3-small',
}: GenerateEmbeddingOptions): Promise<number[]> {
  const { OPENAI_API_KEY } = getConfig()
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

  const response = await openai.embeddings.create({
    model: modelId,
    input: text,
  })

  return response.data[0]?.embedding ?? []
}
