import { getConfig } from '@app/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema.js'

export { schema }

export interface CreateDbOptions {
  databaseUrl?: string
}

/**
 * Creates a Drizzle database client instance
 *
 * @param options - Optional configuration
 * @param options.databaseUrl - Database connection URL (defaults to config.DATABASE_URL)
 * @returns Drizzle database client
 *
 * @example
 * ```ts
 * import { createDb } from '@app/db2'
 *
 * const db = createDb()
 *
 * // With custom URL
 * const db = createDb({ databaseUrl: process.env.DATABASE_URL })
 * ```
 */
export function createDb(options: CreateDbOptions = {}) {
  const config = getConfig()
  const url = options.databaseUrl ?? config.DATABASE_URL

  // Disable prefetch as it's not supported for "Transaction" pool mode
  const client = postgres(url, { prepare: false })
  return drizzle(client, { schema })
}

export type DB = ReturnType<typeof createDb>
