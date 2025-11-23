import { z } from 'zod'

const envSchema = z.object({
  SITE_BASE_URL: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.replace(/\/+$/, ''))
    .default('https://usekyoto.com'),
  AUTH_SECRET: z.string().min(1),

  // GitHub
  GITHUB_CLIENT_ID: z.string().min(1, 'GITHUB_CLIENT_ID is required'),
  GITHUB_CLIENT_SECRET: z.string().min(1, 'GITHUB_CLIENT_SECRET is required'),
  GITHUB_APP_SLUG: z.string().min(1, 'GITHUB_APP_SLUG is required'),
  GITHUB_WEBHOOK_SECRET: z.string().min(1, 'GITHUB_WEBHOOK_SECRET is required'),
  GITHUB_APP_ID: z.string().min(1),
  GITHUB_APP_PRIVATE_KEY: z
    .string()
    .min(1)
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

  // Neon Database
  DATABASE_URL: z.string().min(1),

  // Trigger.dev
  TRIGGER_PROJECT_ID: z.string().optional(),
  TRIGGER_SECRET_KEY: z.string().min(1),

  // AI
  OPENAI_API_KEY: z.string().min(1),
  OPENROUTER_API_KEY: z.string().min(1),
  AI_GATEWAY_API_KEY: z.string().min(1),

  // Daytona
  DAYTONA_API_KEY: z.string().min(1),

  // Sentry
  SENTRY_DSN: z.string().min(1),

  // Context7
  CONTEXT7_API_KEY: z.string().min(1),

  // Linear
  LINEAR_API_KEY: z.string().min(1),
  LINEAR_TEAM_ID: z.string().min(1),

  // Browserbase
  BROWSERBASE_API_KEY: z.string().min(1),
  BROWSERBASE_PROJECT_ID: z.string().min(1),
})

type ParsedEnv = z.infer<typeof envSchema>

export function getConfig(
  environmentVariables?: Record<string, string>,
): ParsedEnv {
  return envSchema.parse(environmentVariables ?? process.env)
}

export type { ParsedEnv }
