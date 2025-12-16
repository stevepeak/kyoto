import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  type InferSelectModel,
  isNotNull,
  ne,
  notInArray,
  sql,
} from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

// Export schema and all its contents
export { schema }

// Re-export drizzle-orm helpers to ensure single instance across monorepo
export {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  type InferSelectModel,
  isNotNull,
  ne,
  notInArray,
  sql,
}

// Export inferred types for tables
export type Owner = InferSelectModel<typeof schema.owners>
export type Repo = InferSelectModel<typeof schema.repos>

export interface CreateDbOptions {
  databaseUrl?: string
}

function resolveDatabaseUrl(options: CreateDbOptions): string {
  // eslint-disable-next-line no-process-env
  const url = options.databaseUrl ?? process.env.DATABASE_URL

  // Allow builds/tests to import DB without requiring env.
  // Connection is lazy until the first query, so this won't break `next build`.
  if (!url) {
    return 'postgresql://placeholder:placeholder@localhost:5432/kyoto'
  }

  return url
}

/**
 * Creates a Drizzle database client instance
 *
 * @param options - Optional configuration
 * @param options.databaseUrl - Database connection URL (defaults to process.env.DATABASE_URL)
 * @returns Drizzle database client
 *
 * @example
 * ```ts
 * import { createDb } from '@app/db'
 *
 * const db = createDb()
 *
 * // With custom URL
 * const db = createDb({ databaseUrl: process.env.DATABASE_URL })
 * ```
 */
export function createDb(options: CreateDbOptions = {}) {
  const client = postgres(resolveDatabaseUrl(options))

  return drizzle(client, { schema })
}

export type DB = ReturnType<typeof createDb>
