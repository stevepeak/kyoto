import { betterAuth } from 'better-auth'
import { kyselyAdapter } from 'better-auth/adapters/kysely-adapter'
import { setupDb } from '@app/db'

// Lazy initialization of database to avoid errors at module load time
let dbInstance: ReturnType<typeof setupDb> | null = null
let authInstance: ReturnType<typeof betterAuth> | null = null

function getDb() {
  if (!dbInstance) {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL environment variable is required. Please set it in your .env.local file.',
      )
    }
    dbInstance = setupDb(databaseUrl)
  }
  return dbInstance
}

function getBaseUrl(): string {
  // Server-side: use environment variable or default
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3001'
  }
  // TODO fix me for preview deploys
  return 'https://usekyoto.com'
}

function getTrustedOrigins(): string[] {
  const origins: string[] = []

  // Always include the base URL
  const baseUrl = getBaseUrl()
  if (baseUrl) {
    origins.push(baseUrl)
  }

  // Include production domain
  if (process.env.SITE_PRODUCTION_URL) {
    origins.push(`https://${process.env.SITE_PRODUCTION_URL}`)
  }

  // Include usekyoto.com
  origins.push('https://usekyoto.com', 'http://localhost:3001')

  // Include any additional trusted origins from environment variable
  if (process.env.BETTER_AUTH_TRUSTED_ORIGINS) {
    const additionalOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(
      ',',
    ).map((origin) => origin.trim())
    origins.push(...additionalOrigins)
  }

  // Remove duplicates
  return Array.from(new Set(origins))
}

export function getAuth() {
  if (!authInstance) {
    authInstance = betterAuth({
      baseURL: getBaseUrl(),
      trustedOrigins: getTrustedOrigins(),
      database: kyselyAdapter(getDb(), {
        type: 'postgres',
      }),
      verification: {
        fields: {
          // Map better-auth's expected field names to our database column names
          expiresAt: 'expires_at', // better-auth expects 'expiresAt', our table has 'expires_at'
        },
      },
      emailAndPassword: {
        enabled: true,
      },
      socialProviders: {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID!,
          clientSecret: process.env.GITHUB_CLIENT_SECRET!,
          scope: ['email'],
        },
      },
    })
  }
  return authInstance
}
