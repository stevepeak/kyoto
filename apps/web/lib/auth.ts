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

export function getAuth() {
  if (!authInstance) {
    authInstance = betterAuth({
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
        },
      },
    })
  }
  return authInstance
}
