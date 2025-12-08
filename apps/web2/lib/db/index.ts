import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

// eslint-disable-next-line no-process-env
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

// eslint-disable-next-line no-process-env
const connectionString = process.env.DATABASE_URL

// Disable prefetch as it's not supported for "Transaction" pool mode
export const client = postgres(connectionString, { prepare: false })
export const db = drizzle(client, { schema })

export type DB = typeof db
