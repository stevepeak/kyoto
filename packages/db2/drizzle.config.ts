import { defineConfig } from 'drizzle-kit'

// Only require DATABASE_URL for Drizzle operations
// eslint-disable-next-line no-process-env
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required')
}

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
})
