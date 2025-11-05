# Migration Plan: Kysely to Drizzle ORM

## Overview

This document outlines the complete migration plan from Kysely (type-safe SQL query builder) to Drizzle ORM. The migration will affect the database package (`packages/db`), API package (`packages/api`), and the web application (`apps/web`).

## Current State Analysis

### Kysely Usage Locations

1. **Database Package (`packages/db`)**:
   - `src/db.ts` - Database connection setup with Neon/Postgres support
   - `src/types.gen.ts` - Auto-generated types from Kysely codegen
   - `src/types.ts` - Type exports
   - `src/utils.ts` - JSON helper using Kysely's `sql` and `RawBuilder`
   - `src/column-types.ts` - Custom column type definitions

2. **API Package (`packages/api`)**:
   - `src/context.ts` - tRPC context with `Kysely<DB>` type
   - `src/actions/users/getters.ts` - User queries
   - `src/actions/users/setters.ts` - User mutations
   - `src/actions/github/installations.ts` - GitHub installation sync queries
   - `src/routers/org.ts` - Organization queries
   - `src/routers/repo.ts` - Repository queries
   - `src/helpers/kysely-trprc.ts` - Kysely-specific error helper

3. **Web Application (`apps/web`)**:
   - `src/server/db.ts` - Database instance setup
   - `src/server/create-auth.ts` - Better-auth configuration (requires Kysely)

### Database Schema

Current tables:

- `accounts` - Better-auth account table
- `credentials` - Better-auth credentials table
- `sessions` - Better-auth sessions table
- `users` - User table with custom fields
- `verifications` - Better-auth verifications table
- `owners` - GitHub owners/organizations
- `repos` - GitHub repositories

All tables use:

- UUID primary keys (`gen_random_uuid()`)
- `timestamptz` for timestamps
- Auto-updated `updated_at` via triggers
- Snake_case column names (mapped to camelCase in TypeScript)

## Critical Considerations

### Better-Auth Compatibility

**⚠️ IMPORTANT**: `better-auth` currently requires Kysely as its database adapter. There are three potential approaches:

1. **Dual ORM Approach (Recommended)**: Keep Kysely for better-auth tables only, use Drizzle for application tables
2. **Wait for Better-Auth Support**: Monitor better-auth for Drizzle adapter support
3. **Auth Migration**: Migrate to a different auth solution that supports Drizzle

**Recommendation**: Use approach #1 (dual ORM) for immediate migration. This allows:

- Full Drizzle migration for application code
- Minimal changes to better-auth setup
- Clean separation of concerns

### Migration Strategy

Since we're starting from scratch with migrations, we'll:

1. Use Drizzle Kit for schema definition and migrations
2. Keep existing `node-pg-migrate` setup for better-auth tables (if using dual ORM)
3. Generate Drizzle schema from existing database structure initially

## Migration Steps

### Phase 1: Setup Drizzle Infrastructure

#### 1.1 Install Dependencies

**File**: `packages/db/package.json`

```json
{
  "dependencies": {
    "drizzle-orm": "@latest",
    "drizzle-kit": "@latest"
    // Keep existing: pg, @neondatabase/serverless, ws
    // Remove: kysely, kysely-neon, kysely-codegen
  }
}
```

**Actions**:

- Remove `kysely`, `kysely-neon`, `kysely-codegen` from dependencies
- Add `drizzle-orm` and `drizzle-kit` (as dev dependency)
- Keep `pg` and `@neondatabase/serverless` for connection pooling

#### 1.2 Create Drizzle Configuration

**New File**: `packages/db/drizzle.config.ts`

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
})
```

#### 1.3 Update Package Scripts

**File**: `packages/db/package.json`

Replace scripts:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:schema:dump": "pg_dump -s -O -x -d \"$DATABASE_URL\" | sed '/^SET /d; /set_config/d' > schema.sql",
    "db:seed": "psql \"$DATABASE_URL\" -f seed.sql",
    "db:load:schema": "psql \"$DATABASE_URL\" -f schema.sql",
    "db:reset": "psql \"$DATABASE_URL\" -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;' && pnpm db:push && pnpm db:seed"
  }
}
```

### Phase 2: Define Drizzle Schema

#### 2.1 Create Schema Directory Structure

**New Files**:

- `packages/db/src/schema/index.ts` - Main schema export
- `packages/db/src/schema/auth.ts` - Better-auth tables (if dual ORM)
- `packages/db/src/schema/app.ts` - Application tables (owners, repos, etc.)
- `packages/db/src/schema/types.ts` - Shared types and enums

#### 2.2 Define Application Schema

**File**: `packages/db/src/schema/app.ts`

```typescript
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  bigint,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const owners = pgTable(
  'owners',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    externalId: bigint('external_id', { mode: 'bigint' }),
    login: text('login').notNull(),
    name: text('name'),
    type: text('type'),
    avatarUrl: text('avatar_url'),
    htmlUrl: text('html_url'),
    installationId: bigint('installation_id', { mode: 'bigint' }),
  },
  (table) => ({
    loginUnique: uniqueIndex('owners_login_unique').on(table.login),
    externalIdUnique: uniqueIndex('owners_external_id_unique').on(
      table.externalId,
    ),
    installationIdUnique: uniqueIndex('owners_installation_id_unique').on(
      table.installationId,
    ),
  }),
)

export const repos = pgTable(
  'repos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => owners.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    externalId: bigint('external_id', { mode: 'bigint' }),
    name: text('name').notNull(),
    fullName: text('full_name'),
    private: boolean('private').notNull().default(false),
    description: text('description'),
    defaultBranch: text('default_branch'),
    htmlUrl: text('html_url'),
    enabled: boolean('enabled').notNull().default(false),
  },
  (table) => ({
    ownerNameUnique: uniqueIndex('repos_owner_name_unique').on(
      table.ownerId,
      table.name,
    ),
    externalIdUnique: uniqueIndex('repos_external_id_unique').on(
      table.externalId,
    ),
  }),
)

export const ownersRelations = relations(owners, ({ many }) => ({
  repos: many(repos),
}))

export const reposRelations = relations(repos, ({ one }) => ({
  owner: one(owners, {
    fields: [repos.ownerId],
    references: [owners.id],
  }),
}))
```

**File**: `packages/db/src/schema/types.ts`

```typescript
import { pgEnum } from 'drizzle-orm/pg-core'

export const userStatusEnum = pgEnum('user_status', [
  'active',
  'disabled',
  'invited',
])
```

**File**: `packages/db/src/schema/index.ts`

```typescript
export * from './app'
export * from './types'
// Export auth schema only if using dual ORM approach
```

#### 2.3 Handle Database Functions and Triggers

Drizzle doesn't manage triggers automatically. We'll need to:

1. Create a migration file for triggers:
   - `trigger_set_timestamp()` function
   - Triggers for `updated_at` columns

2. Or use Drizzle's `sql` helper in schema (less ideal):

```typescript
import { sql } from 'drizzle-orm'

// In schema definition
updatedAt: timestamp('updated_at', { withTimezone: true })
  .defaultNow()
  .$onUpdate(() => sql`now()`)
```

**Recommendation**: Create initial migration with SQL for triggers and functions.

### Phase 3: Database Connection Setup

#### 3.1 Replace Kysely Connection with Drizzle

**File**: `packages/db/src/db.ts`

Replace entire file:

```typescript
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless'
import ws from 'ws'

import * as schema from './schema'

type DatabasePool = NeonPool | Pool

function attachPoolErrorHandler(pool: DatabasePool, poolType: string): void {
  pool.on('error', (err: Error) => {
    console.error(`Unexpected error on idle ${poolType} client`, err)
  })
}

function setupNeonDb(connectionString: string) {
  console.log('[db] setting up neon db with WebSocket support')

  neonConfig.webSocketConstructor = ws

  const pool = new NeonPool({ connectionString })
  attachPoolErrorHandler(pool, 'Neon')

  return drizzleNeon(pool, { schema })
}

function setupPostgresDb(connectionString: string) {
  console.log('[db] setting up postgres db')

  const pool = new Pool({
    connectionString,
  })
  attachPoolErrorHandler(pool, 'Postgres')

  return drizzle(pool, { schema })
}

export function setupDb(connectionString: string) {
  if (!connectionString) {
    throw new Error('connectionString cannot be empty')
  }

  const isNeonDb = connectionString.includes('.neon.tech/')
  return isNeonDb
    ? setupNeonDb(connectionString)
    : setupPostgresDb(connectionString)
}

export type DB = ReturnType<typeof setupDb>
```

#### 3.2 Update Type Exports

**File**: `packages/db/src/types.ts`

Replace with:

```typescript
export * from './schema'
export type { DB } from './db'
```

**File**: `packages/db/src/index.ts`

```typescript
export { setupDb } from './db'
export type { DB } from './db'
export * from './schema'
export { json } from './utils'
```

#### 3.3 Update Utils

**File**: `packages/db/src/utils.ts`

Replace with Drizzle's SQL helper:

```typescript
import { sql } from 'drizzle-orm'

export function json<T>(value: T) {
  return sql`CAST(${JSON.stringify(value)} AS JSONB)`.mapWith(JSON.parse) as T
}
```

### Phase 4: Update API Package

#### 4.1 Update Context Type

**File**: `packages/api/src/context.ts`

```typescript
import type { DB, User } from '@app/db/types'
import type { InferSelectModel } from 'drizzle-orm'
import { users } from '@app/db/schema'

export interface SessionUser {
  id: string
}

export interface Session {
  user: SessionUser | null
}

export interface Env {
  siteBaseUrl: string
}

// Use Drizzle's type inference
export type UserSelect = InferSelectModel<typeof users>

export interface Context {
  db: DB
  env: Env
  session: Session | null
  user: UserSelect | null
}
```

#### 4.2 Migrate User Actions

**File**: `packages/api/src/actions/users/getters.ts`

```typescript
import { users } from '@app/db/schema'
import { eq } from 'drizzle-orm'
import type { DB, UserSelect } from '@app/db/types'
import { TRPCError } from '@trpc/server'

export async function getUser({
  db,
  userId,
}: {
  db: DB
  userId: string
}): Promise<UserSelect> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!user) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
    })
  }

  return user
}

export async function listUsers({ db }: { db: DB }): Promise<UserSelect[]> {
  return await db.query.users.findMany()
}
```

**File**: `packages/api/src/actions/users/setters.ts`

```typescript
import { users } from '@app/db/schema'
import { eq, sql } from 'drizzle-orm'
import type { DB, UserSelect } from '@app/db/types'
import type { InferSelectModel } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'

export function touchUserLastInteractionAt({
  db,
  userId,
}: {
  db: DB
  userId: string
}) {
  return db
    .update(users)
    .set({ lastInteractionAt: new Date() })
    .where(eq(users.id, userId))
}

export async function updateUser({
  db,
  userId,
  values,
}: {
  db: DB
  userId: string
  values: Partial<InferSelectModel<typeof users>>
}): Promise<UserSelect> {
  const [updated] = await db
    .update(users)
    .set(values)
    .where(eq(users.id, userId))
    .returning()

  if (!updated) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
    })
  }

  return updated
}
```

#### 4.3 Migrate GitHub Installation Actions

**File**: `packages/api/src/actions/github/installations.ts`

Key changes:

- Replace Kysely query builder with Drizzle
- Use `db.insert().values().onConflictDoUpdate()` for upserts
- Use `db.query` for selects
- Use `eq`, `inArray`, `isNotNull` operators

```typescript
import { owners, repos } from '@app/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import type { DB } from '@app/db/types'
import { z } from 'zod'
// ... rest of imports

export async function syncGithubInstallation(
  params: SyncInstallationParams,
): Promise<{
  ownerId: string
  ownerLogin: string
  repoCount: number
}> {
  const { db, appId, privateKey, installationId } = params

  // ... GitHub API calls ...

  // Upsert owner
  const [owner] = await db
    .insert(owners)
    .values({
      externalId: ownerExternalId ? BigInt(ownerExternalId) : null,
      login: ownerLogin,
      name: account?.name ?? null,
      type: account?.type ?? null,
      avatarUrl: account?.avatar_url ?? null,
      htmlUrl: account?.html_url ?? null,
      installationId: BigInt(installationId),
    })
    .onConflictDoUpdate({
      target: owners.login,
      set: {
        externalId: ownerExternalId ? BigInt(ownerExternalId) : null,
        name: account?.name ?? null,
        type: account?.type ?? null,
        avatarUrl: account?.avatar_url ?? null,
        htmlUrl: account?.html_url ?? null,
        installationId: BigInt(installationId),
      },
    })
    .returning()

  if (!owner) {
    throw new Error('Failed to create owner')
  }

  // Upsert repos
  let repoCount = 0
  for (const repo of reposResponse) {
    const repoExternalId = BigInt(repo.id)
    const existing = await db.query.repos.findFirst({
      where: eq(repos.externalId, repoExternalId),
    })

    const enabled = existing?.enabled ?? false

    await db
      .insert(repos)
      .values({
        ownerId: owner.id,
        externalId: repoExternalId,
        name: repo.name,
        fullName: repo.full_name ?? null,
        private: repo.private ?? false,
        description: repo.description ?? null,
        defaultBranch: repo.default_branch ?? null,
        htmlUrl: repo.html_url ?? null,
        enabled,
      })
      .onConflictDoUpdate({
        target: [repos.ownerId, repos.name],
        set: {
          fullName: repo.full_name ?? null,
          private: repo.private ?? false,
          description: repo.description ?? null,
          defaultBranch: repo.default_branch ?? null,
          htmlUrl: repo.html_url ?? null,
          enabled,
        },
      })

    repoCount += 1
  }

  return { ownerId: owner.id, ownerLogin, repoCount }
}

export async function setEnabledRepos(
  params: SetEnabledReposParams,
): Promise<{ updated: number }> {
  const { db, ownerLogin, repoNames } = params

  const owner = await db.query.owners.findFirst({
    where: eq(owners.login, ownerLogin),
  })

  if (!owner) {
    return { updated: 0 }
  }

  // Disable all repos for owner
  await db
    .update(repos)
    .set({ enabled: false })
    .where(eq(repos.ownerId, owner.id))

  if (repoNames.length === 0) {
    return { updated: 0 }
  }

  // Enable selected repos
  const result = await db
    .update(repos)
    .set({ enabled: true })
    .where(and(eq(repos.ownerId, owner.id), inArray(repos.name, repoNames)))
    .returning()

  return { updated: result.length }
}
```

#### 4.4 Update Routers

**File**: `packages/api/src/routers/org.ts`

```typescript
import { owners, repos } from '@app/db/schema'
import { isNotNull, eq } from 'drizzle-orm'
import { router, protectedProcedure } from '../trpc'

export const orgRouter = router({
  getDefault: protectedProcedure.query(() => {
    return {
      org: {
        id: 'demo-org',
        slug: 'demo-org',
        name: 'Demo Org',
      },
    }
  }),
  listInstalled: protectedProcedure.query(async ({ ctx }) => {
    const ownersList = await ctx.db.query.owners.findMany({
      where: isNotNull(owners.installationId),
      columns: {
        login: true,
        name: true,
      },
      orderBy: owners.login,
    })

    return {
      orgs: ownersList.map((o) => ({
        slug: o.login,
        name: o.name ?? o.login,
      })),
    }
  }),
  getSetupStatus: protectedProcedure.query(async ({ ctx }) => {
    const installed = await ctx.db.query.owners.findFirst({
      where: isNotNull(owners.installationId),
      columns: { id: true },
    })

    if (!installed) {
      return { hasInstallation: false, hasEnabledRepos: false }
    }

    const enabledRepo = await ctx.db.query.repos.findFirst({
      where: eq(repos.enabled, true),
      columns: { id: true },
    })

    return {
      hasInstallation: true,
      hasEnabledRepos: Boolean(enabledRepo),
    }
  }),
})
```

**File**: `packages/api/src/routers/repo.ts`

```typescript
import { owners, repos } from '@app/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { protectedProcedure, router } from '../trpc'

export const repoRouter = router({
  listByOrg: protectedProcedure
    .input(z.object({ orgSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const owner = await ctx.db.query.owners.findFirst({
        where: eq(owners.login, input.orgSlug),
      })

      if (!owner) {
        return {
          repos: [] as Array<{
            id: string
            name: string
            defaultBranch: string | null
            enabled: boolean
          }>,
        }
      }

      const reposList = await ctx.db.query.repos.findMany({
        where: eq(repos.ownerId, owner.id),
        columns: {
          id: true,
          name: true,
          defaultBranch: true,
          enabled: true,
        },
        orderBy: repos.name,
      })

      return { repos: reposList }
    }),

  setEnabled: protectedProcedure
    .input(z.object({ orgSlug: z.string(), repoNames: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const owner = await ctx.db.query.owners.findFirst({
        where: eq(owners.login, input.orgSlug),
      })

      if (!owner) {
        return { updated: 0 }
      }

      // Disable all repos for owner
      await ctx.db
        .update(repos)
        .set({ enabled: false })
        .where(eq(repos.ownerId, owner.id))

      if (input.repoNames.length === 0) {
        return { updated: 0 }
      }

      // Enable selected repos
      const result = await ctx.db
        .update(repos)
        .set({ enabled: true })
        .where(
          and(
            eq(repos.ownerId, owner.id),
            inArray(repos.name, input.repoNames),
          ),
        )
        .returning()

      return { updated: result.length }
    }),
})
```

#### 4.5 Remove Kysely Helper

**File**: `packages/api/src/helpers/kysely-trprc.ts`

Delete this file or replace with generic error helper:

**New File**: `packages/api/src/helpers/trpc-errors.ts`

```typescript
import { TRPCError } from '@trpc/server'

export function trpcNotFoundError(): TRPCError {
  return new TRPCError({
    code: 'NOT_FOUND',
    message: 'The requested resource was not found.',
  })
}
```

### Phase 5: Handle Better-Auth (Dual ORM Approach)

#### 5.1 Keep Kysely for Auth Tables Only

**File**: `packages/db/src/db-kysely.ts` (new file)

```typescript
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless'
import { CamelCasePlugin, Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import ws from 'ws'

import type { AuthDB } from './types-kysely' // Auth tables only

type DatabasePool = NeonPool | Pool

function attachPoolErrorHandler(pool: DatabasePool, poolType: string): void {
  pool.on('error', (err: Error) => {
    console.error(`Unexpected error on idle ${poolType} client`, err)
  })
}

function createKyselyInstance(pool: DatabasePool): Kysely<AuthDB> {
  return new Kysely<AuthDB>({
    dialect: new PostgresDialect({
      pool,
    }),
    log: ['error'],
    plugins: [new CamelCasePlugin({ maintainNestedObjectKeys: true })],
  })
}

function setupNeonDb(connectionString: string): Kysely<AuthDB> {
  console.log('[db] setting up neon db (Kysely) with WebSocket support')

  neonConfig.webSocketConstructor = ws

  const pool = new NeonPool({ connectionString })
  attachPoolErrorHandler(pool, 'Neon')

  return createKyselyInstance(pool)
}

function setupPostgresDb(connectionString: string): Kysely<AuthDB> {
  console.log('[db] setting up postgres db (Kysely)')

  const pool = new Pool({
    connectionString,
  })
  attachPoolErrorHandler(pool, 'Postgres')

  return createKyselyInstance(pool)
}

export function setupKyselyDb(connectionString: string): Kysely<AuthDB> {
  if (!connectionString) {
    throw new Error('connectionString cannot be empty')
  }

  const isNeonDb = connectionString.includes('.neon.tech/')
  return isNeonDb
    ? setupNeonDb(connectionString)
    : setupPostgresDb(connectionString)
}
```

#### 5.2 Update Auth Creation

**File**: `apps/web/src/server/create-auth.ts`

```typescript
import type { AuthDB } from '@app/db/types-kysely'
import { setupKyselyDb } from '@app/db'
import { betterAuth, type BetterAuthOptions } from 'better-auth'
import type { Kysely } from 'kysely'
// ... other imports

export function createAuth(options: {
  db: Kysely<AuthDB> // Use Kysely instance
  baseURL: string
  secret: string
  github: {
    clientId: string
    clientSecret: string
  }
}) {
  // ... rest of implementation unchanged
}
```

#### 5.3 Update Server DB Setup

**File**: `apps/web/src/server/db.ts`

```typescript
import { setupDb } from '@app/db'
import { setupKyselyDb } from '@app/db'
import { DATABASE_URL } from 'astro:env/server'

export const db = setupDb(DATABASE_URL) // Drizzle instance
export const dbKysely = setupKyselyDb(DATABASE_URL) // Kysely instance for auth
```

**File**: `apps/web/src/server/auth.ts`

```typescript
import { dbKysely } from './db'
// ... use dbKysely for better-auth
```

### Phase 6: Update Type Exports

#### 6.1 Clean Up Types

**File**: `packages/db/src/types.ts`

```typescript
// Export Drizzle types
export * from './schema'
export type { DB } from './db'

// Re-export commonly used types
export type {
  InferSelectModel,
  InferInsertModel,
  InferUpdateModel,
} from 'drizzle-orm'
```

#### 6.2 Remove Generated Types

**File**: `packages/db/src/types.gen.ts`

Delete this file - Drizzle generates types from schema automatically.

### Phase 7: Testing and Validation

#### 7.1 Update Tests

**File**: `packages/db/src/db.test.ts`

Update to use Drizzle:

```typescript
import { describe, it, expect } from 'vitest'
import { setupDb } from './db'
import { owners, repos } from './schema'
import { eq } from 'drizzle-orm'

describe('Database', () => {
  it('should connect and query', async () => {
    const db = setupDb(process.env.DATABASE_URL!)

    const result = await db.query.owners.findMany()
    expect(result).toBeDefined()
  })
})
```

#### 7.2 Update API Tests

Update any API tests that use database queries to use Drizzle syntax.

### Phase 8: Cleanup

1. Remove Kysely dependencies from `packages/db/package.json`
2. Remove `kysely-codegen` configuration files
3. Remove old migration files (if starting fresh)
4. Update documentation
5. Remove `packages/api/src/helpers/kysely-trprc.ts`

## Migration Checklist

### Database Package (`packages/db`)

- [ ] Install Drizzle dependencies
- [ ] Remove Kysely dependencies
- [ ] Create `drizzle.config.ts`
- [ ] Create `src/schema/` directory structure
- [ ] Define application schema in Drizzle
- [ ] Update `src/db.ts` to use Drizzle
- [ ] Update `src/utils.ts` for Drizzle
- [ ] Update `src/types.ts` exports
- [ ] Delete `src/types.gen.ts`
- [ ] Update package.json scripts
- [ ] Create initial migration with triggers/functions
- [ ] (If dual ORM) Create `src/db-kysely.ts` for auth
- [ ] (If dual ORM) Create `src/types-kysely.ts` for auth types

### API Package (`packages/api`)

- [ ] Update `src/context.ts` types
- [ ] Migrate `src/actions/users/getters.ts`
- [ ] Migrate `src/actions/users/setters.ts`
- [ ] Migrate `src/actions/github/installations.ts`
- [ ] Migrate `src/routers/org.ts`
- [ ] Migrate `src/routers/repo.ts`
- [ ] Update `src/helpers/kysely-trprc.ts` or remove
- [ ] Update all imports from `@app/db/types`

### Web Application (`apps/web`)

- [ ] Update `src/server/db.ts` (add Kysely instance if dual ORM)
- [ ] Update `src/server/create-auth.ts` to use Kysely instance
- [ ] Update `src/server/auth.ts` to use correct DB instance

### Testing

- [ ] Update `packages/db/src/db.test.ts`
- [ ] Update API action tests
- [ ] Run full test suite
- [ ] Verify all queries work correctly

### Documentation

- [ ] Update README with new migration commands
- [ ] Update database rules in `.cursor/rules/database.mdc`
- [ ] Document dual ORM approach (if used)

## Key Differences: Kysely vs Drizzle

### Query Building

**Kysely**:

```typescript
await db
  .selectFrom('users')
  .where('id', '=', userId)
  .selectAll()
  .executeTakeFirst()
```

**Drizzle**:

```typescript
await db.query.users.findFirst({
  where: eq(users.id, userId),
})
```

### Updates

**Kysely**:

```typescript
await db
  .updateTable('users')
  .set({ name: 'John' })
  .where('id', '=', userId)
  .returningAll()
  .executeTakeFirst()
```

**Drizzle**:

```typescript
const [user] = await db
  .update(users)
  .set({ name: 'John' })
  .where(eq(users.id, userId))
  .returning()
```

### Inserts with Conflict

**Kysely**:

```typescript
await db
  .insertInto('users')
  .values(data)
  .onConflict((oc) => oc.column('email').doUpdateSet(data))
  .returningAll()
  .executeTakeFirst()
```

**Drizzle**:

```typescript
await db
  .insert(users)
  .values(data)
  .onConflictDoUpdate({
    target: users.email,
    set: data,
  })
  .returning()
```

### Type Safety

**Kysely**: Uses codegen to generate types from database
**Drizzle**: Types inferred directly from schema definitions

## Potential Issues and Solutions

### Issue 1: Better-Auth Requires Kysely

**Solution**: Use dual ORM approach - keep Kysely for auth tables only

### Issue 2: Trigger Management

**Solution**: Create SQL migration for triggers, or use Drizzle's `$onUpdate` (less ideal)

### Issue 3: BigInt Handling

**Solution**: Use `bigint` with `{ mode: 'bigint' }` in Drizzle schema

### Issue 4: JSONB Columns

**Solution**: Use `jsonb()` type in Drizzle, define TypeScript interfaces for structure

### Issue 5: Snake_case to camelCase

**Solution**: Drizzle uses exact column names - access via `table.fieldName` (already camelCase in schema)

## Rollback Plan

If migration encounters issues:

1. Keep both ORMs in codebase temporarily
2. Gradually migrate routes one at a time
3. Use feature flags to switch between ORMs
4. Revert commits if critical issues arise

## Timeline Estimate

- Phase 1 (Setup): 1-2 hours
- Phase 2 (Schema): 2-3 hours
- Phase 3 (Connection): 1 hour
- Phase 4 (API Migration): 4-6 hours
- Phase 5 (Better-Auth): 2-3 hours
- Phase 6 (Types): 1 hour
- Phase 7 (Testing): 2-3 hours
- Phase 8 (Cleanup): 1 hour

**Total**: ~14-20 hours

## Next Steps

1. Review this plan
2. Decide on better-auth approach (dual ORM recommended)
3. Create feature branch for migration
4. Execute phases sequentially
5. Test thoroughly before merging
