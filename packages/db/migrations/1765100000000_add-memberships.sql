-- Up Migration

-- Owner memberships table
CREATE TABLE owner_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'member',
    CONSTRAINT owner_memberships_owner_user_unique UNIQUE (owner_id, user_id)
);

COMMENT ON TABLE owner_memberships IS 'Links users to owners (organizations) with membership roles';
COMMENT ON COLUMN owner_memberships.id IS 'Unique identifier for each owner membership';
COMMENT ON COLUMN owner_memberships.created_at IS 'Creation timestamp';
COMMENT ON COLUMN owner_memberships.updated_at IS 'Update timestamp (auto-managed by trigger)';
COMMENT ON COLUMN owner_memberships.owner_id IS 'FK to owners.id that this membership grants access to';
COMMENT ON COLUMN owner_memberships.user_id IS 'FK to users.id that has access to the owner';
COMMENT ON COLUMN owner_memberships.role IS 'Membership role for this owner (e.g., member, admin)';

CREATE INDEX owner_memberships_user_id_idx ON owner_memberships (user_id);

CREATE TRIGGER set_timestamp_owner_memberships
BEFORE UPDATE ON owner_memberships
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Repo memberships table
CREATE TABLE repo_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    repo_id uuid NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'member',
    CONSTRAINT repo_memberships_repo_user_unique UNIQUE (repo_id, user_id)
);

COMMENT ON TABLE repo_memberships IS 'Links users to individual repositories with membership roles';
COMMENT ON COLUMN repo_memberships.id IS 'Unique identifier for each repo membership';
COMMENT ON COLUMN repo_memberships.created_at IS 'Creation timestamp';
COMMENT ON COLUMN repo_memberships.updated_at IS 'Update timestamp (auto-managed by trigger)';
COMMENT ON COLUMN repo_memberships.repo_id IS 'FK to repos.id that this membership grants access to';
COMMENT ON COLUMN repo_memberships.user_id IS 'FK to users.id that has access to the repo';
COMMENT ON COLUMN repo_memberships.role IS 'Membership role for this repo (e.g., member, admin)';

CREATE INDEX repo_memberships_user_id_idx ON repo_memberships (user_id);
CREATE INDEX repo_memberships_repo_id_idx ON repo_memberships (repo_id);

CREATE TRIGGER set_timestamp_repo_memberships
BEFORE UPDATE ON repo_memberships
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Down Migration

DROP TABLE IF EXISTS repo_memberships;
DROP TABLE IF EXISTS owner_memberships;

