-- Up Migration

-- Owners table
CREATE TABLE owners (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    external_id bigint,
    login text NOT NULL,
    name text,
    type text,
    avatar_url text,
    html_url text,
    CONSTRAINT owners_login_unique UNIQUE (login),
    CONSTRAINT owners_external_id_unique UNIQUE (external_id)
);

COMMENT ON COLUMN owners.id IS 'Unique identifier for each owner';
COMMENT ON COLUMN owners.created_at IS 'Creation timestamp';
COMMENT ON COLUMN owners.updated_at IS 'Update timestamp (auto-managed by trigger)';
COMMENT ON COLUMN owners.external_id IS 'External provider id (e.g., GitHub id)';
COMMENT ON COLUMN owners.login IS 'Owner login/handle (e.g., GitHub login)';
COMMENT ON COLUMN owners.name IS 'Display name of the owner';
COMMENT ON COLUMN owners.type IS 'Owner type (e.g., user or organization)';
COMMENT ON COLUMN owners.avatar_url IS 'Avatar image URL';
COMMENT ON COLUMN owners.html_url IS 'HTML profile URL';

CREATE TRIGGER set_timestamp_owners
BEFORE UPDATE ON owners
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Repos table
CREATE TABLE repos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    external_id bigint,
    name text NOT NULL,
    full_name text,
    private boolean NOT NULL DEFAULT false,
    description text,
    default_branch text,
    html_url text,
    CONSTRAINT repos_external_id_unique UNIQUE (external_id),
    CONSTRAINT repos_owner_name_unique UNIQUE (owner_id, name)
);

COMMENT ON COLUMN repos.id IS 'Unique identifier for each repository';
COMMENT ON COLUMN repos.owner_id IS 'FK to owners.id of the repository owner';
COMMENT ON COLUMN repos.created_at IS 'Creation timestamp';
COMMENT ON COLUMN repos.updated_at IS 'Update timestamp (auto-managed by trigger)';
COMMENT ON COLUMN repos.external_id IS 'External provider id (e.g., GitHub repo id)';
COMMENT ON COLUMN repos.name IS 'Short repository name';
COMMENT ON COLUMN repos.full_name IS 'Fully qualified name (e.g., owner/name)';
COMMENT ON COLUMN repos.private IS 'Whether the repository is private';
COMMENT ON COLUMN repos.description IS 'Repository description';
COMMENT ON COLUMN repos.default_branch IS 'Default branch name';
COMMENT ON COLUMN repos.html_url IS 'HTML repository URL';

CREATE TRIGGER set_timestamp_repos
BEFORE UPDATE ON repos
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Down Migration

DROP TABLE IF EXISTS repos;
DROP TABLE IF EXISTS owners;
