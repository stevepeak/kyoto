<!-- 06a61b04-c865-4c72-8162-1a269734ae6b d125c991-1ef6-4331-ba1d-78c1d2f7b3ac -->

# Kysely to Drizzle Migration Plan

## Overview

This plan covers the complete migration from Kysely to Drizzle ORM, including database setup, query migration, migration system conversion, type generation, and Better Auth adapter replacement.

## Phase 1: Setup and Dependencies

### 1.1 Install Drizzle Dependencies

- Add `drizzle-orm@latest` and `drizzle-kit@latest` to `packages/db/package.json`
- Add `@neondatabase/serverless` and `pg` drivers for Drizzle (already present)
- Remove `kysely`, `kysely-codegen` dependencies
- Update `packages/api/package.json`, `packages/cache/package.json`, `apps/web/package.json` to remove Kysely

### 1.2 Create Drizzle Configuration

- Create `packages/db/drizzle.config.ts` with database connection and schema path configuration
- Configure for PostgreSQL with Neon support
- Set up migration output directory

### 1.3 Create Drizzle Schema Files

- Create `packages/db/src/schema/` directory structure
- Convert all tables from `types.gen.ts` to Drizzle schema definitions
- Organize schemas by domain (auth, stories, repos, etc.)
- Export all schemas from `packages/db/src/schema/index.ts`
- Handle custom types (enums, JSONB, timestamps)

## Phase 2: Database Connection Migration

### 2.1 Update Database Setup (`packages/db/src/db.ts`)

- Replace Kysely instance creation with Drizzle `drizzle()` function
- Maintain Neon and Postgres pool support
- Update connection string detection logic
- Export Drizzle instance type for use across codebase

### 2.2 Update Type Exports (`packages/db/src/types.ts`)

- Remove Kysely-generated types export
- Export Drizzle schema types using `InferSelectModel`, `InferInsertModel`
- Maintain backward compatibility for existing type names where possible

### 2.3 Update Utility Functions (`packages/db/src/utils.ts`)

- Replace Kysely `sql` template with Drizzle `sql` helper
- Update `json()` helper function to use Drizzle SQL

## Phase 3: Query Migration

### 3.1 Migrate Helper Functions

- **`packages/api/src/helpers/users.ts`**: Convert all Kysely queries to Drizzle
- `getUser()`: Use `db.select().from(user).where(eq(user.id, userId))`
- `updateUser()`: Use `db.update(user).set(values).where(eq(user.id, userId)).returning()`
- `getUserGithubLogin()`: Convert joins and subqueries
- **`packages/api/src/helpers/memberships.ts`**: Convert complex joins
- `findOwnerForUser()`: Convert innerJoin to Drizzle join syntax
- `findRepoForUser()`: Convert multi-table joins
- `findStoryForUser()`: Convert nested queries
- **`packages/cache/src/cache-service.ts`**: Convert all cache queries
- `getCachedEvidence()`: Convert with array handling and CASE statements
- `saveCachedEvidence()`: Convert insert with onConflict
- `invalidateCache()`: Convert delete queries

### 3.2 Migrate Router Queries

- **`packages/api/src/routers/story.ts`**: Convert all story-related queries
- `listByRepo`: Convert select with joins and subqueries
- `get`: Convert select query
- `create`: Convert insert with returning
- `update`: Convert update queries
- All other mutations and queries
- **`packages/api/src/routers/org.ts`**: Convert organization queries
- **`packages/api/src/routers/repo.ts`**: Convert repository queries
- **`packages/api/src/routers/run.ts`**: Convert run queries
- **`packages/api/src/routers/user.ts`**: Convert user queries

### 3.3 Update Context (`packages/api/src/context.ts`)

- Replace `Kysely<DB>` type with Drizzle database instance type
- Update all type imports from Kysely to Drizzle

### 3.4 Update TRPC Helper (`packages/api/src/helpers/kysely-trprc.ts`)

- Rename file to `drizzle-trpc.ts` or similar
- Update error handling if needed (Drizzle may have different error patterns)

## Phase 4: Migration System Conversion

### 4.1 Convert Existing Migrations

- Create Drizzle migration generator script
- Convert all 24 SQL migration files to Drizzle migration format
- Maintain migration order and timestamps
- Test each migration individually
- Create `packages/db/migrations/` directory for Drizzle migrations

### 4.2 Update Migration Scripts (`packages/db/package.json`)

- Replace `node-pg-migrate` commands with `drizzle-kit` commands
- Update `db:migrate:create` to use `drizzle-kit generate`
- Update `db:migrate:up` to use `drizzle-kit migrate` or custom migration runner
- Update `db:migrate:down` (Drizzle doesn't have built-in down migrations, may need custom solution)
- Update `db:codegen` to use `drizzle-kit introspect` or remove if using schema-first approach

### 4.3 Migration Runner

- Create custom migration runner if needed for production deployments
- Ensure migrations run in correct order
- Handle migration state tracking

## Phase 5: Better Auth Adapter

### 5.1 Research Drizzle Adapter

- pnpm add better-auth/adapters/drizzle

Example usage
// auth.ts

-     import { betterAuth } from "better-auth";
-     import { drizzleAdapter } from "better-auth/adapters/drizzle";
-     import { db } from "./database.ts"; // Your Drizzle instance
-     import * as schema from "./db/schema"; // Your Drizzle schema
-
-     export const auth = betterAuth({
-       database: drizzleAdapter(db, {
-         provider: "pg", // or "sqlite", "mysql"
-         schema: schema,
-       }),
-       // ... rest of your Better Auth configuration
-     });

### 5.2 Update Auth Configuration

- **`apps/auth/src/index.ts`**: Replace `kyselyAdapter` with Drizzle adapter
- **`apps/web/lib/auth.ts`**: Replace `kyselyAdapter` with Drizzle adapter
- Update type definitions in `apps/web/types/better-auth-adapters.d.ts`

## Phase 6: Type System Updates

### 6.1 Remove Kysely Types

- Delete or deprecate `packages/db/src/types.gen.ts`
- Update all imports from `@app/db/types` to use Drizzle schema types
- Update `Selectable`, `Updateable` type usage throughout codebase

### 6.2 Update Column Types (`packages/db/src/column-types.ts`)

- Convert Kysely `ColumnType` usage to Drizzle column definitions
- Update custom type helpers

### 6.3 Update Exports (`packages/db/src/index.ts`)

- Remove Kysely `sql` export
- Export Drizzle `sql` helper
- Update all type exports

## Phase 7: Testing and Validation

### 7.1 Query Testing

- Test all migrated queries individually
- Verify complex joins work correctly
- Test JSONB operations
- Test array operations and CASE statements
- Verify transaction support if used

### 7.2 Migration Testing

- reset and migrate the local database to test

DATABASE_URL="postgres://postgres@localhost:5432/kyoto" p run --filter "@app/db" db:reset

DATABASE_URL="postgres://postgres@localhost:5432/kyoto" p run --filter "@app/db" db:migrate

psql -d kyoto

## Phase 8: Cleanup

### 8.1 Remove Kysely Code

- Remove all Kysely imports
- Remove `CamelCasePlugin` usage (Drizzle handles this differently)
- Clean up unused Kysely utilities
- Remove `knip.config.ts` Kysely reference

### 8.2 Update Documentation

- Update any migration documentation
- Update developer setup instructions
- Document new migration workflow

### 8.3 Update Build Configuration

- Remove Kysely from `apps/web/next.config.js` webpack aliases
- Update any build scripts that reference Kysely

## Key Files to Modify

**Core Database:**

- `packages/db/src/db.ts` - Database connection
- `packages/db/src/schema/` - New schema directory (to be created)
- `packages/db/src/types.ts` - Type exports
- `packages/db/src/utils.ts` - Utility functions
- `packages/db/package.json` - Dependencies and scripts
- `packages/db/drizzle.config.ts` - New config file

**API Layer:**

- `packages/api/src/context.ts` - Context types
- `packages/api/src/helpers/users.ts` - User queries
- `packages/api/src/helpers/memberships.ts` - Membership queries
- `packages/api/src/helpers/kysely-trprc.ts` - TRPC helper
- `packages/api/src/routers/*.ts` - All router files

**Cache Layer:**

- `packages/cache/src/cache-service.ts` - Cache queries

**Auth:**

- `apps/auth/src/index.ts` - Auth server
- `apps/web/lib/auth.ts` - Web auth config
- `apps/web/types/better-auth-adapters.d.ts` - Type definitions

**Migrations:**

- All files in `packages/db/migrations/` - Convert to Drizzle format

## Migration Strategy Notes

1. **Incremental Approach**: Consider migrating one module at a time to reduce risk
2. **Type Safety**: Drizzle provides better type safety with schema-first approach
3. **Migration Format**: Drizzle uses TypeScript migrations vs SQL, providing better type checking
4. **Better Auth**: May need to verify Drizzle adapter availability or create workaround
5. **Testing**: Critical to test all queries as Drizzle syntax differs from Kysely

## Potential Challenges

1. **Better Auth Compatibility**: May not have official Drizzle adapter yet
2. **Complex Joins**: Some Kysely join patterns may need restructuring for Drizzle
3. **SQL Template Usage**: Custom SQL in Kysely needs conversion to Drizzle `sql` helper
4. **Migration Rollback**: Drizzle doesn't have built-in down migrations
5. **Type Generation**: Moving from codegen to schema-first approach requires schema definition upfront

### To-dos

- [ ] Install drizzle-orm and drizzle-kit packages, remove Kysely dependencies from all packages
- [ ] Create drizzle.config.ts with database connection and schema configuration
- [ ] Convert all database tables from types.gen.ts to Drizzle schema definitions in packages/db/src/schema/
- [ ] Update packages/db/src/db.ts to use Drizzle instead of Kysely, maintain Neon/Postgres support
- [ ] Update packages/db/src/types.ts to export Drizzle schema types instead of Kysely types
- [ ] Convert all queries in packages/api/src/helpers/ (users.ts, memberships.ts) to Drizzle syntax
- [ ] Convert all queries in packages/cache/src/cache-service.ts to Drizzle syntax
- [ ] Convert all queries in packages/api/src/routers/\*.ts to Drizzle syntax
- [ ] Update packages/api/src/context.ts to use Drizzle database type instead of Kysely
- [ ] Convert all 24 SQL migration files to Drizzle TypeScript migration format
- [ ] Update packages/db/package.json scripts to use drizzle-kit instead of node-pg-migrate
- [ ] Replace kyselyAdapter with Drizzle adapter in apps/auth/src/index.ts and apps/web/lib/auth.ts
- [ ] Update packages/db/src/utils.ts and packages/db/src/index.ts to use Drizzle SQL helpers
- [ ] Remove all Kysely imports, update knip.config.ts, remove webpack aliases in next.config.js
- [ ] Test all migrations run correctly and verify database schema matches expectations
- [ ] Test all migrated queries work correctly, especially complex joins and JSONB operations
