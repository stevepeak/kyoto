import { findGitRoot } from '@app/shell'
import { readFile, writeFile } from 'node:fs/promises'
import { z } from 'zod'

import { pwdKyoto } from './find-kyoto-dir'

const providerSchema = z.enum(['openai', 'vercel', 'openrouter', 'anthropic'])

export const schema = z.object({
  experimental: z.boolean().optional(),
  latest: z
    .object({
      sha: z.string(),
      branch: z.string(),
    })
    .optional(),
  ai: z.object({
    provider: providerSchema,
    apiKey: z.string(),
    model: z.string(),
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
      'Kyoto config is invalid. Please run `kyoto setup` to configure your AI provider and API key.',
    )
  }
}

/**
 * Updates the user session token in the config (preserving other user fields).
 */
export async function updateUserSessionToken(args: {
  sessionToken: string
}): Promise<void> {
  const gitRoot = await findGitRoot()
  const { config: configPath } = await pwdKyoto(gitRoot)
  const content = await readFile(configPath, 'utf-8')
  const config = schema.parse(JSON.parse(content))

  config.user = {
    sessionToken: args.sessionToken,
    userId: config.user.userId,
    openrouterApiKey: config.user.openrouterApiKey,
  }

  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
}

export async function updateUserAuth(args: {
  sessionToken: string
  userId: string
  openrouterApiKey: string
}): Promise<void> {
  const gitRoot = await findGitRoot()
  const { config: configPath } = await pwdKyoto(gitRoot)

  const config = schema.parse({
    experimental: false,
    ai: {
      provider: 'openrouter',
      apiKey: args.openrouterApiKey,
      model: 'x-ai/grok-4.1-fast',
    },
    user: {
      sessionToken: args.sessionToken,
      userId: args.userId,
      openrouterApiKey: args.openrouterApiKey,
    },
  })

  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
}
