import { z } from 'zod'

const envSchema = z.object({
  APP_URL: z
    .string()
    .url()
    .transform((value) => value.replace(/\/+$/, ''))
    .default('https://usekyoto.com'),

  // Better Auth
  BETTER_AUTH_SECRET: z
    .string()
    .min(1, 'BETTER_AUTH_SECRET is required')
    .describe(
      'Secret key for Better Auth encryption/decryption. Generate with: openssl rand -base64 32',
    ),

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
  DATABASE_URL: z.string().startsWith('postgres://'),

  // Trigger.dev
  TRIGGER_PROJECT_ID: z.string().optional(),
  TRIGGER_SECRET_KEY: z.string().min(1).startsWith('tr_'),

  // AI
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  OPENROUTER_API_KEY: z.string().startsWith('sk-or-v1-'),
  OPENROUTER_PROVISION_KEY: z.string().startsWith('sk-or-v1-'),
  AI_GATEWAY_API_KEY: z.string().startsWith('vck_'),

  // Daytona
  DAYTONA_API_KEY: z.string().startsWith('dtn_'),

  // Sentry
  SENTRY_DSN: z.string().startsWith('https://'),

  // PostHog
  POSTHOG_API_KEY: z.string().min(1),
  POSTHOG_HOST: z.string().url().default('https://us.i.posthog.com'),

  // Context7
  CONTEXT7_API_KEY: z.string().startsWith('ctx7sk-'),

  // Linear
  LINEAR_API_KEY: z.string().startsWith('lin_api_'),
  LINEAR_TEAM_ID: z.string().min(1),

  // Browserbase
  BROWSERBASE_API_KEY: z.string().min(1),
  BROWSERBASE_PROJECT_ID: z.string().min(1),
})

export type ParsedEnv = z.infer<typeof envSchema>

export function getConfig(
  environmentVariables?: Record<string, string>,
): ParsedEnv {
  // eslint-disable-next-line no-process-env
  const env = environmentVariables ?? process.env

  // Normalize public env vars to secret env vars
  const normalizedEnv = {
    ...env,
    POSTHOG_API_KEY: env.POSTHOG_API_KEY ?? env.NEXT_PUBLIC_POSTHOG_API_KEY,
    POSTHOG_HOST: env.POSTHOG_HOST ?? env.NEXT_PUBLIC_POSTHOG_HOST,
    SENTRY_DSN: env.SENTRY_DSN ?? env.NEXT_PUBLIC_SENTRY_DSN,
    GITHUB_APP_SLUG: env.GITHUB_APP_SLUG ?? env.NEXT_PUBLIC_GITHUB_APP_SLUG,
    APP_URL: env.APP_URL ?? env.NEXT_PUBLIC_APP_URL,
  }

  return envSchema.parse(normalizedEnv)
}
