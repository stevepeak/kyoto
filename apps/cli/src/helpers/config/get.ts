import { readFile } from 'node:fs/promises'
import { z } from 'zod'

import { getConfigPath } from './find-kyoto-dir'

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
    login: z.string(),
    sessionToken: z.string(),
    userId: z.string(),
    openrouterApiKey: z.string(),
  }),
})

export type Config = z.infer<typeof schema>

/**
 * Gets the config from ~/.kyoto/config.json and validates it.
 * Falls back to environment variables (KYOTO_TOKEN) if config.json is missing.
 * Throws an error if the config is invalid or missing AI configuration.
 * @returns The validated config
 * @throws {Error} If config is missing or invalid
 */
export async function getConfig(): Promise<Config> {
  try {
    const configPath = await getConfigPath()
    const content = await readFile(configPath, 'utf-8')
    const config = schema.parse(JSON.parse(content))

    // Schema validation ensures ai is present
    return config
  } catch (error) {
    if (error instanceof Error && error.message.includes('not initialized')) {
      throw error
    }

    // Config file doesn't exist or is invalid - check for environment variables
    // This is useful for GitHub Actions where config.json won't exist
    // eslint-disable-next-line no-process-env
    const kyotoAiToken = process.env.KYOTO_TOKEN
    if (kyotoAiToken) {
      // Create a minimal config from environment variables
      // Note: userId and sessionToken are placeholders for GitHub Actions.
      // They are not used for authentication - only the API key (KYOTO_TOKEN) is used.
      const envConfig: Config = {
        analytics: false,
        experimental: false,
        ai: {
          provider: 'openrouter',
          apiKey: kyotoAiToken,
          model: 'x-ai/grok-4.1-fast',
        },
        user: {
          login: 'github-actions',
          sessionToken: 'github-actions-token',
          userId: 'github-actions-user',
          openrouterApiKey: kyotoAiToken,
        },
      }
      return schema.parse(envConfig)
    }

    // Config file doesn't exist or is invalid
    throw new Error(
      'Kyoto config is invalid. Please run `kyoto setup ai` to configure your AI provider and API key.',
    )
  }
}
