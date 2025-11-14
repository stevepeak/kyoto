import { generateText as aiGenerateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { parseEnv } from '@app/config'

interface GenerateTextOptions {
  /** The prompt to generate text from */
  prompt: string
  /** Optional model ID, defaults to 'gpt-4o-mini' */
  modelId?: string
}

/**
 * Generate text using OpenAI. This is a simple wrapper around the AI SDK's generateText function.
 */
export async function generateText({
  prompt,
  modelId = 'gpt-4o-mini',
}: GenerateTextOptions): Promise<string> {
  const { OPENAI_API_KEY } = parseEnv()
  const openAiProvider = createOpenAI({ apiKey: OPENAI_API_KEY })

  const { text } = await aiGenerateText({
    model: openAiProvider(modelId),
    prompt,
  })

  return text
}
