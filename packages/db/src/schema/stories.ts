import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
} from 'drizzle-orm/pg-core'
import { storyStateEnum } from './enums'
import { repos } from './repos'
import { runs } from './runs'

export const stories = pgTable('stories', {
  id: uuid('id').primaryKey().defaultRandom(),
  repoId: uuid('repo_id')
    .notNull()
    .references(() => repos.id),
  name: text('name').notNull(),
  story: text('story').notNull(),
  state: storyStateEnum('state').default('processing'),
  decomposition: jsonb('decomposition'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const storyTestResults = pgTable('story_test_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id')
    .notNull()
    .references(() => stories.id),
  runId: uuid('run_id').references(() => runs.id),
  status: text('status').notNull(),
  analysisVersion: integer('analysis_version').notNull(),
  analysis: jsonb('analysis'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  durationMs: integer('duration_ms'),
  extTriggerDev: jsonb('ext_trigger_dev'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const storyEvidenceCache = pgTable('story_evidence_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id')
    .notNull()
    .references(() => stories.id),
  commitSha: text('commit_sha').notNull(),
  branchName: text('branch_name').notNull(),
  cacheData: jsonb('cache_data').notNull(),
  runId: uuid('run_id').references(() => runs.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})
