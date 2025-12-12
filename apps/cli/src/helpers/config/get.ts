import { findGitRoot } from '@app/shell'
import { readFile } from 'node:fs/promises'
import { z } from 'zod'

import { pwdKyoto } from './find-kyoto-dir'

const providerSchema = z.enum(['openai', 'vercel', 'openrouter', 'anthropic'])

export const schema = z.object({
  latest: z
    .object({
      sha: z.string(),
      branch: z.string(),
    })
    .optional(),
  auth: z
    .object({
      sessionToken: z.string(),
      userLogin: z.string().optional(),
      appUrl: z.string().optional(),
      createdAt: z.string().optional(),
    })
    .optional(),
  ai: z.object({
    provider: providerSchema,
    apiKey: z.string(),
    model: z.string(),
  }),
  experimental: z.boolean().optional(),
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
    const parsed = JSON.parse(content)
    const config = schema.parse(parsed)

    // Schema validation ensures ai is present
    return config
  } catch (error) {
    if (error instanceof Error && error.message.includes('not initialized')) {
      throw error
    }
    // Config file doesn't exist or is invalid
    throw new Error(
      'Kyoto config is invalid. Please run `kyoto setup` to configure your AI provider and API key.',
    )
  }
}
