import { getConfig } from '@app/config'
import { defineConfig } from 'drizzle-kit'

const config = getConfig()

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: config.DATABASE_URL,
  },
})
