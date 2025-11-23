import type { Env } from '../context'
import { z } from 'zod'

const envSchema = z.object({
  GITHUB_APP_ID: z.union([z.string(), z.number()]).transform((val) => {
    const parsed = typeof val === 'string' ? Number.parseInt(val, 10) : val
    if (Number.isNaN(parsed)) {
      throw new TypeError(`Invalid GITHUB_APP_ID: ${val} is not a number`)
    }
    return parsed
  }),
  GITHUB_APP_PRIVATE_KEY: z
    .string()
    .min(1, 'GITHUB_APP_PRIVATE_KEY is required')
    // Trigger.dev use: `openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in key-rsa.pem | base64 | pbcopy`
    .describe('Provide the GitHub App private key in PKCS#8 PEM format.')
    .transform((val, ctx) => {
      const header = '-----BEGIN PRIVATE KEY-----'
      const trimmed = val.trim()

      if (trimmed.includes(header)) {
        return trimmed
      }

      const normalized = trimmed.replace(/\s+/g, '')

      try {
        const decoded = Buffer.from(normalized, 'base64')
          .toString('utf-8')
          .trim()

        if (decoded.startsWith(header)) {
          return decoded
        }
      } catch {
        // fall through to issue below
      }

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'GITHUB_APP_PRIVATE_KEY must be a PEM string or a base64-encoded PEM string',
      })
      return z.NEVER
    }),
  GITHUB_WEBHOOK_SECRET: z.string().min(1, 'GITHUB_WEBHOOK_SECRET is required'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  TRIGGER_SECRET_KEY: z
    .string()
    .min(1, 'TRIGGER_SECRET_KEY is required')
    .startsWith('tr_'),
  LINEAR_API_KEY: z.string().startsWith('lin_'),
})

type ParsedEnv = z.infer<typeof envSchema>

export function parseEnv(env: Env): ParsedEnv {
  return envSchema.parse({
    GITHUB_APP_ID: env.githubAppId,
    GITHUB_APP_PRIVATE_KEY: env.githubAppPrivateKey,
    GITHUB_WEBHOOK_SECRET: env.githubWebhookSecret,
    OPENAI_API_KEY: env.openAiApiKey,
    DATABASE_URL: env.databaseUrl,
    TRIGGER_SECRET_KEY: env.triggerSecretKey,
    LINEAR_API_KEY: env.linearApiKey,
  })
}
