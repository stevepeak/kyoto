import {
  bigint,
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

// Enums
export const userStatusEnum = pgEnum('user_status', [
  'active',
  'disabled',
  'invited',
])

// Better-Auth tables
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  status: userStatusEnum('status').notNull().default('active'),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  login: text('login'),
  lastInteractionAt: timestamp('last_interaction_at', { withTimezone: true }),
  timeZone: text('time_zone'),
  openrouterApiKey: text('openrouter_api_key'),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
    withTimezone: true,
  }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const credential = pgTable('credential', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id'),
  email: text('email'),
  label: text('label'),
  tokens: jsonb('tokens').notNull(),
  primary: boolean('primary'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// Application tables
export const owners = pgTable(
  'owners',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    externalId: bigint('external_id', { mode: 'number' }).unique(),
    login: text('login').notNull().unique(),
    name: text('name'),
    type: text('type'),
    avatarUrl: text('avatar_url'),
    htmlUrl: text('html_url'),
    installationId: bigint('installation_id', { mode: 'number' }),
  },
  (table) => ({
    installationIdIdx: index('owners_installation_id_unique').on(
      table.installationId,
    ),
  }),
)

export const ownerMemberships = pgTable(
  'owner_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => owners.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
  },
  (table) => ({
    ownerUserUnique: unique('owner_memberships_owner_user_unique').on(
      table.ownerId,
      table.userId,
    ),
    userIdIdx: index('owner_memberships_user_id_idx').on(table.userId),
  }),
)

export const repos = pgTable(
  'repos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => owners.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    externalId: bigint('external_id', { mode: 'number' }).unique(),
    name: text('name').notNull(),
    fullName: text('full_name'),
    private: boolean('private').notNull().default(false),
    description: text('description'),
    defaultBranch: text('default_branch'),
    htmlUrl: text('html_url'),
    enabled: boolean('enabled').notNull().default(false),
  },
  (table) => ({
    ownerNameUnique: unique('repos_owner_name_unique').on(
      table.ownerId,
      table.name,
    ),
  }),
)

export const repoMemberships = pgTable(
  'repo_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    repoId: uuid('repo_id')
      .notNull()
      .references(() => repos.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
  },
  (table) => ({
    repoUserUnique: unique('repo_memberships_repo_user_unique').on(
      table.repoId,
      table.userId,
    ),
    repoIdIdx: index('repo_memberships_repo_id_idx').on(table.repoId),
    userIdIdx: index('repo_memberships_user_id_idx').on(table.userId),
  }),
)

export const cliAuthState = pgTable('cli_auth_state', {
  stateToken: text('state_token').primaryKey(),
  sessionToken: text('session_token'),
  userId: text('user_id'),
  openrouterApiKey: text('openrouter_api_key'),
  redirectUri: text('redirect_uri'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// Experimental tables
export const xpStories = pgTable(
  'xp_stories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    instructions: text('instructions').notNull(),
    scheduleText: text('schedule_text'),
    cronSchedule: text('cron_schedule'),
    triggerScheduleId: text('trigger_schedule_id'),
  },
  (table) => ({
    userIdIdx: index('xp_stories_user_id_idx').on(table.userId),
  }),
)

export const xpStoriesRuns = pgTable(
  'xp_stories_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => xpStories.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('pending'),
    sessionId: text('session_id'),
    sessionRecordingUrl: text('session_recording_url'),
    observations: jsonb('observations'),
    error: text('error'),
  },
  (table) => ({
    storyIdIdx: index('xp_stories_runs_story_id_idx').on(table.storyId),
    userIdIdx: index('xp_stories_runs_user_id_idx').on(table.userId),
  }),
)
