import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // eslint-disable-next-line no-process-env
    url: process.env.DATABASE_URL!,
  },
})
