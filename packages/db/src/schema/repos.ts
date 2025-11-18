import {
  pgTable,
  uuid,
  text,
  timestamp,
  bigint,
  boolean,
  unique,
} from 'drizzle-orm/pg-core'
import { owners } from './owners'
import { users } from './auth'

export const repos = pgTable(
  'repos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => owners.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    externalId: bigint('external_id', { mode: 'number' }),
    name: text('name').notNull(),
    fullName: text('full_name'),
    private: boolean('private').notNull().default(false),
    description: text('description'),
    defaultBranch: text('default_branch'),
    htmlUrl: text('html_url'),
    enabled: boolean('enabled').default(true),
  },
  (table) => ({
    externalIdUnique: unique().on(table.externalId),
    ownerNameUnique: unique().on(table.ownerId, table.name),
  }),
)

export const repoMemberships = pgTable('repo_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  repoId: uuid('repo_id')
    .notNull()
    .references(() => repos.id),
  role: text('role').default('member'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})
