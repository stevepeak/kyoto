-- Up Migration
-- Fix better-auth tables to match better-auth expectations
-- 1. Rename tables from plural to singular
-- 2. Change all ID columns from UUID to TEXT

-- Step 1: Drop all foreign key constraints that reference users.id
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_user_id_fkey;
ALTER TABLE credentials DROP CONSTRAINT IF EXISTS credentials_user_id_fkey;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE owner_memberships DROP CONSTRAINT IF EXISTS owner_memberships_user_id_fkey;
ALTER TABLE repo_memberships DROP CONSTRAINT IF EXISTS repo_memberships_user_id_fkey;

-- Step 2: Change users.id from UUID to TEXT
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE users ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE users ADD CONSTRAINT user_pkey PRIMARY KEY (id);

-- Step 3: Change all user_id foreign key columns from UUID to TEXT
ALTER TABLE accounts ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE credentials ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE sessions ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE owner_memberships ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE repo_memberships ALTER COLUMN user_id TYPE text USING user_id::text;

-- Step 4: Change accounts.id from UUID to TEXT
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_pkey;
ALTER TABLE accounts ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE accounts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE accounts ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);

-- Step 5: Change credentials.id from UUID to TEXT
ALTER TABLE credentials DROP CONSTRAINT IF EXISTS credentials_pkey;
ALTER TABLE credentials ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE credentials ALTER COLUMN id DROP DEFAULT;
ALTER TABLE credentials ADD CONSTRAINT credentials_pkey PRIMARY KEY (id);

-- Step 6: Change sessions.id from UUID to TEXT
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_pkey;
ALTER TABLE sessions ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE sessions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE sessions ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);

-- Step 7: Fix verification table (already singular, just need to fix ID type)
ALTER TABLE verifications DROP CONSTRAINT IF EXISTS verifications_pkey;
ALTER TABLE verifications ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE verifications ALTER COLUMN id DROP DEFAULT;
ALTER TABLE verifications ADD CONSTRAINT verification_pkey PRIMARY KEY (id);

-- Step 8: Rename tables from plural to singular
ALTER TABLE verifications RENAME TO verification;
ALTER TABLE accounts RENAME TO account;
ALTER TABLE credentials RENAME TO credential;
ALTER TABLE sessions RENAME TO session;
ALTER TABLE users RENAME TO "user";

-- Step 9: Recreate foreign key constraints with new table names
ALTER TABLE account ADD CONSTRAINT account_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
ALTER TABLE credential ADD CONSTRAINT credential_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
ALTER TABLE session ADD CONSTRAINT session_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
ALTER TABLE owner_memberships ADD CONSTRAINT owner_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
ALTER TABLE repo_memberships ADD CONSTRAINT repo_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;

-- Step 10: Update trigger names to match new table names
DROP TRIGGER IF EXISTS set_timestamp_users ON "user";
CREATE TRIGGER set_timestamp_user BEFORE UPDATE ON "user" FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_accounts ON account;
CREATE TRIGGER set_timestamp_account BEFORE UPDATE ON account FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS update_credentials_timestamp ON credential;
CREATE TRIGGER update_credential_timestamp BEFORE UPDATE ON credential FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_sessions ON session;
CREATE TRIGGER set_timestamp_session BEFORE UPDATE ON session FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Down Migration
-- Revert all changes in reverse order

-- Drop triggers
DROP TRIGGER IF EXISTS set_timestamp_user ON "user";
DROP TRIGGER IF EXISTS set_timestamp_account ON account;
DROP TRIGGER IF EXISTS update_credential_timestamp ON credential;
DROP TRIGGER IF EXISTS set_timestamp_session ON session;
DROP TRIGGER IF EXISTS set_timestamp_verifications ON verification;

-- Drop foreign key constraints
ALTER TABLE account DROP CONSTRAINT IF EXISTS account_user_id_fkey;
ALTER TABLE credential DROP CONSTRAINT IF EXISTS credential_user_id_fkey;
ALTER TABLE session DROP CONSTRAINT IF EXISTS session_user_id_fkey;
ALTER TABLE owner_memberships DROP CONSTRAINT IF EXISTS owner_memberships_user_id_fkey;
ALTER TABLE repo_memberships DROP CONSTRAINT IF EXISTS repo_memberships_user_id_fkey;

-- Rename tables back to plural
ALTER TABLE account RENAME TO accounts;
ALTER TABLE credential RENAME TO credentials;
ALTER TABLE session RENAME TO sessions;
ALTER TABLE "user" RENAME TO users;

-- Revert verification table
ALTER TABLE verification DROP CONSTRAINT IF EXISTS verification_pkey;
ALTER TABLE verification ALTER COLUMN id TYPE uuid USING id::uuid;
ALTER TABLE verification ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE verification ADD CONSTRAINT verifications_pkey PRIMARY KEY (id);

-- Revert sessions.id to UUID
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_pkey;
ALTER TABLE sessions ALTER COLUMN id TYPE uuid USING id::uuid;
ALTER TABLE sessions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE sessions ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);

-- Revert credentials.id to UUID
ALTER TABLE credentials DROP CONSTRAINT IF EXISTS credentials_pkey;
ALTER TABLE credentials ALTER COLUMN id TYPE uuid USING id::uuid;
ALTER TABLE credentials ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE credentials ADD CONSTRAINT credentials_pkey PRIMARY KEY (id);

-- Revert accounts.id to UUID
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_pkey;
ALTER TABLE accounts ALTER COLUMN id TYPE uuid USING id::uuid;
ALTER TABLE accounts ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE accounts ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);

-- Revert user_id columns to UUID
ALTER TABLE accounts ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
ALTER TABLE credentials ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
ALTER TABLE sessions ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
ALTER TABLE owner_memberships ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
ALTER TABLE repo_memberships ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- Revert user.id to UUID (table will be renamed back to users in previous step)
ALTER TABLE users DROP CONSTRAINT IF EXISTS user_pkey;
ALTER TABLE users ALTER COLUMN id TYPE uuid USING id::uuid;
ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id);

-- Recreate foreign key constraints with old table names
ALTER TABLE accounts ADD CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE credentials ADD CONSTRAINT credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE sessions ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE owner_memberships ADD CONSTRAINT owner_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE repo_memberships ADD CONSTRAINT repo_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Recreate triggers with old names
CREATE TRIGGER set_timestamp_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_accounts BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER update_credentials_timestamp BEFORE UPDATE ON credentials FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_sessions BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_verifications BEFORE UPDATE ON verification FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

