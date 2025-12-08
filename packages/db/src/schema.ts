import {
  bigint,
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

// Custom types
const vector = customType<{ data: number[] }>({
  dataType() {
    return 'vector(1536)'
  },
})

// Enums
export const storyStateEnum = pgEnum('story_state', [
  'active',
  'generated',
  'paused',
  'archived',
  'planned',
  'processing',
])

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

export const runs = pgTable(
  'runs',
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
    commitSha: text('commit_sha'),
    branchName: text('branch_name').notNull(),
    commitMessage: text('commit_message'),
    prNumber: text('pr_number'),
    status: text('status').notNull(),
    summary: text('summary'),
    stories: jsonb('stories').notNull().default('[]'),
    number: integer('number').notNull(),
    gitAuthor: jsonb('git_author'),
    extTriggerDev: jsonb('ext_trigger_dev'),
  },
  (table) => ({
    repoIdIdx: index('runs_repo_id_idx').on(table.repoId),
    branchNameIdx: index('runs_branch_name_idx').on(table.branchName),
    commitShaIdx: index('runs_commit_sha_idx').on(table.commitSha),
    statusIdx: index('runs_status_idx').on(table.status),
    repoCommitIdx: index('runs_repo_commit_idx').on(
      table.repoId,
      table.commitSha,
    ),
    repoNumberIdx: index('runs_repo_id_number_idx').on(
      table.repoId,
      table.number,
    ),
    repoNumberUnique: unique('runs_repo_id_number_unique_idx').on(
      table.repoId,
      table.number,
    ),
  }),
)

export const stories = pgTable(
  'stories',
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
    name: text('name').notNull(),
    story: text('story').notNull(),
    decomposition: jsonb('decomposition'),
    state: storyStateEnum('state').notNull().default('active'),
    metadata: jsonb('metadata'),
    embedding: vector('embedding'),
  },
  (table) => ({
    repoIdIdx: index('stories_repo_id_idx').on(table.repoId),
    repoIdStateIdx: index('stories_repo_id_state_idx').on(
      table.repoId,
      table.state,
    ),
  }),
)

export const storyEvidenceCache = pgTable(
  'story_evidence_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    branchName: text('branch_name').notNull(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    commitSha: text('commit_sha').notNull(),
    cacheData: jsonb('cache_data').notNull(),
    runId: uuid('run_id').references(() => runs.id, {
      onDelete: 'set null',
    }),
  },
  (table) => ({
    storyIdIdx: index('story_evidence_cache_story_id_idx').on(table.storyId),
    branchNameIdx: index('story_evidence_cache_branch_name_idx').on(
      table.branchName,
    ),
    commitShaIdx: index('story_evidence_cache_commit_sha_idx').on(
      table.commitSha,
    ),
    runIdIdx: index('story_evidence_cache_run_id_idx').on(table.runId),
    storyCommitUnique: unique(
      'story_evidence_cache_story_commit_unique_idx',
    ).on(table.storyId, table.commitSha),
  }),
)

export const storyTestResults = pgTable(
  'story_test_results',
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
      .references(() => stories.id, { onDelete: 'cascade' }),
    runId: uuid('run_id').references(() => runs.id, {
      onDelete: 'set null',
    }),
    status: text('status').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    durationMs: integer('duration_ms'),
    analysis: jsonb('analysis'),
    analysisVersion: integer('analysis_version').notNull(),
    extTriggerDev: jsonb('ext_trigger_dev'),
  },
  (table) => ({
    storyIdIdx: index('story_test_results_story_id_idx').on(table.storyId),
    runIdIdx: index('story_test_results_run_id_idx').on(table.runId),
    statusIdx: index('story_test_results_status_idx').on(table.status),
  }),
)
