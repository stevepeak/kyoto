import { z } from 'zod'

const providerSchema = z.enum(['openai', 'vercel', 'openrouter', 'anthropic'])

export const configSchema = z.object({
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
  experimental: z.boolean().optional(),
})

export type Config = z.infer<typeof configSchema>
