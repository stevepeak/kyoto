import { getConfig } from '@app/config'
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
export type Run = InferSelectModel<typeof schema.runs>

// RunStory type - represents a story within a run's stories JSONB field
export interface RunStory {
  storyId: string
  resultId: string | null
  status: 'pass' | 'fail' | 'running' | 'skipped' | 'error'
  summary: string | null
  startedAt: string | null
  completedAt: string | null
}

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
 * import { createDb } from '@app/db'
 *
 * const db = createDb()
 *
 * // With custom URL
 * const db = createDb({ databaseUrl: process.env.DATABASE_URL })
 * ```
 */
export function createDb(options: CreateDbOptions = {}) {
  const config = getConfig()
  const client = postgres(options.databaseUrl ?? config.DATABASE_URL)

  return drizzle(client, { schema })
}

export type DB = ReturnType<typeof createDb>
