import { defineConfig } from 'drizzle-kit'

// Only require DATABASE_URL for Drizzle operations
// Use a placeholder for migration generation if not provided
const databaseUrl =
  // eslint-disable-next-line no-process-env
  process.env.DATABASE_URL ||
  'postgresql://placeholder:placeholder@localhost:5432/kyoto'

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
})
