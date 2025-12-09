import { findGitRoot } from '@app/shell'
import { readFile } from 'node:fs/promises'
import { z } from 'zod'

import { pwdKyoto } from './find-kyoto-dir'

type Provider = 'openai' | 'vercel' | 'openrouter' | 'anthropic'

const providerSchema = z.enum(['openai', 'vercel', 'openrouter', 'anthropic'])

const detailsJsonSchema = z.object({
  latest: z
    .object({
      sha: z.string(),
      branch: z.string(),
    })
    .optional(),
  ai: z
    .object({
      provider: providerSchema,
      apiKey: z.string(),
      model: z.string().optional(),
    })
    .optional(),
})

type AiConfig = {
  provider: Provider
  apiKey: string
  model?: string
} | null

/**
 * Reads AI configuration from .kyoto/cache/config.json
 * @returns AI configuration or null if not found
 */
export async function getAiConfig(): Promise<AiConfig> {
  try {
    const gitRoot = await findGitRoot()
    const { config: detailsPath } = await pwdKyoto(gitRoot)

    const content = await readFile(detailsPath, 'utf-8')
    const parsed = JSON.parse(content)
    const details = detailsJsonSchema.parse(parsed)

    if (details.ai?.provider && details.ai?.apiKey) {
      return {
        provider: details.ai.provider,
        apiKey: details.ai.apiKey,
        model: details.ai.model,
      }
    }

    return null
  } catch {
    // File doesn't exist or is invalid, return null
    return null
  }
}
