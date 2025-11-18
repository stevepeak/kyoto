import {
  pgTable,
  uuid,
  text,
  timestamp,
  bigint,
  unique,
} from 'drizzle-orm/pg-core'
import { users } from './auth'

export const owners = pgTable(
  'owners',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    externalId: bigint('external_id', { mode: 'number' }),
    login: text('login').notNull(),
    name: text('name'),
    type: text('type'),
    avatarUrl: text('avatar_url'),
    htmlUrl: text('html_url'),
    installationId: bigint('installation_id', { mode: 'number' }),
  },
  (table) => ({
    loginUnique: unique().on(table.login),
    externalIdUnique: unique().on(table.externalId),
  }),
)

export const ownerMemberships = pgTable('owner_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => owners.id),
  role: text('role').default('member'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})
