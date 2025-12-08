import { getConfig } from '@app/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

// Export schema and all its contents
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

/**
 * Type helpers for table types
 */
export type User = typeof schema.user.$inferSelect
export type NewUser = typeof schema.user.$inferInsert
export type Session = typeof schema.session.$inferSelect
export type NewSession = typeof schema.session.$inferInsert
export type Account = typeof schema.account.$inferSelect
export type NewAccount = typeof schema.account.$inferInsert
export type Verification = typeof schema.verification.$inferSelect
export type NewVerification = typeof schema.verification.$inferInsert
export type Credential = typeof schema.credential.$inferSelect
export type NewCredential = typeof schema.credential.$inferInsert
export type Owner = typeof schema.owners.$inferSelect
export type NewOwner = typeof schema.owners.$inferInsert
export type OwnerMembership = typeof schema.ownerMemberships.$inferSelect
export type NewOwnerMembership = typeof schema.ownerMemberships.$inferInsert
export type Repo = typeof schema.repos.$inferSelect
export type NewRepo = typeof schema.repos.$inferInsert
export type RepoMembership = typeof schema.repoMemberships.$inferSelect
export type NewRepoMembership = typeof schema.repoMemberships.$inferInsert
export type Run = typeof schema.runs.$inferSelect
export type NewRun = typeof schema.runs.$inferInsert
export type Story = typeof schema.stories.$inferSelect
export type NewStory = typeof schema.stories.$inferInsert
export type StoryEvidenceCache = typeof schema.storyEvidenceCache.$inferSelect
export type NewStoryEvidenceCache =
  typeof schema.storyEvidenceCache.$inferInsert
export type StoryTestResult = typeof schema.storyTestResults.$inferSelect
export type NewStoryTestResult = typeof schema.storyTestResults.$inferInsert
