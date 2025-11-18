import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
} from 'drizzle-orm/pg-core'
import { repos } from './repos'

export const runs = pgTable('runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  repoId: uuid('repo_id')
    .notNull()
    .references(() => repos.id),
  number: integer('number').notNull(),
  status: text('status').notNull(),
  branchName: text('branch_name').notNull(),
  commitSha: text('commit_sha'),
  commitMessage: text('commit_message'),
  prNumber: text('pr_number'),
  summary: text('summary'),
  stories: jsonb('stories').notNull(),
  gitAuthor: jsonb('git_author'),
  extTriggerDev: jsonb('ext_trigger_dev'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})
