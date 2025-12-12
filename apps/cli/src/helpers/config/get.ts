import { findGitRoot } from '@app/shell'
import { readFile } from 'node:fs/promises'
import { z } from 'zod'

import { pwdKyoto } from './find-kyoto-dir'

const providerSchema = z.enum(['openai', 'vercel', 'openrouter', 'anthropic'])

// * Do not exit this.
export const schema = z.object({
  analytics: z.boolean().default(true),
  experimental: z.boolean().default(false),
  latest: z
    .object({
      sha: z.string(),
      branch: z.string(),
    })
    .optional(),
  ai: z.object({
    provider: providerSchema.default('openrouter'),
    apiKey: z.string(),
    model: z.string().default('x-ai/grok-4.1-fast'),
  }),
  user: z.object({
    sessionToken: z.string(),
    userId: z.string(),
    openrouterApiKey: z.string(),
  }),
})

export type Config = z.infer<typeof schema>

/**
 * Gets the config from .kyoto/config.json and validates it.
 * Throws an error if the config is invalid or missing AI configuration.
 * @returns The validated config
 * @throws {Error} If config is missing or invalid
 */
export async function getConfig(): Promise<Config> {
  try {
    const gitRoot = await findGitRoot()
    const { config: configPath } = await pwdKyoto(gitRoot)
    const content = await readFile(configPath, 'utf-8')
    const config = schema.parse(JSON.parse(content))

    // Schema validation ensures ai is present
    return config
  } catch (error) {
    if (error instanceof Error && error.message.includes('not initialized')) {
      throw error
    }
    // Config file doesn't exist or is invalid
    throw new Error(
      'Kyoto config is invalid. Please run `kyoto setup ai` to configure your AI provider and API key.',
    )
  }
}
