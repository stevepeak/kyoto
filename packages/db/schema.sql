--
-- PostgreSQL database dump
--

\restrict 2UfAb9FrSgxGgEhyNQQsvFCrhCeTHRx428GiSJSYemuI4Dj3yTzIhUYbEzP4Lny

-- Dumped from database version 16.10 (Postgres.app)
-- Dumped by pg_dump version 16.10 (Postgres.app)


--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: story_state; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.story_state AS ENUM (
    'active',
    'generated',
    'paused',
    'archived',
    'planned',
    'processing'
);


--
-- Name: user_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_status AS ENUM (
    'active',
    'disabled',
    'invited'
);


--
-- Name: get_next_run_number(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_run_number(p_repo_id uuid) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_next_number integer;
  v_lock_id bigint;
BEGIN
  -- Use repo_id hash as advisory lock ID to serialize per-repo
  -- hashtext returns int4, so we convert to bigint for advisory lock
  v_lock_id := abs(hashtext(p_repo_id::text))::bigint;
  
  -- Acquire advisory lock for this repo (blocks until available)
  PERFORM pg_advisory_xact_lock(v_lock_id);
  
  -- Get next number (now safely serialized for this repo)
  SELECT COALESCE(MAX(number), 0) + 1
  INTO v_next_number
  FROM public.runs
  WHERE repo_id = p_repo_id;
  
  RETURN v_next_number;
END;
$$;


--
-- Name: normalize_owner_login(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.normalize_owner_login() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.login = LOWER(NEW.login);
  RETURN NEW;
END;
$$;


--
-- Name: normalize_repo_fields(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.normalize_repo_fields() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.name = LOWER(NEW.name);
  IF NEW.full_name IS NOT NULL THEN
    NEW.full_name = LOWER(NEW.full_name);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_run_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_run_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Only set number if it's not already provided
  IF NEW.number IS NULL THEN
    NEW.number := public.get_next_run_number(NEW.repo_id);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: trigger_set_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_set_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;




--
-- Name: account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account (
    id text NOT NULL,
    user_id text NOT NULL,
    account_id text NOT NULL,
    provider_id text NOT NULL,
    access_token text,
    refresh_token text,
    id_token text,
    access_token_expires_at timestamp with time zone,
    refresh_token_expires_at timestamp with time zone,
    scope text,
    password text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: COLUMN account.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.account.id IS 'Unique identifier for each account';


--
-- Name: COLUMN account.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.account.user_id IS 'The id of the user';


--
-- Name: COLUMN account.account_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.account.account_id IS 'The id of the account as provided by the SSO or equal to user_id for credential accounts';


--
-- Name: COLUMN account.provider_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.account.provider_id IS 'The id of the provider';


--
-- Name: COLUMN account.access_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.account.access_token IS 'The access token of the account. Returned by the provider';


--
-- Name: COLUMN account.refresh_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.account.refresh_token IS 'The refresh token of the account. Returned by the provider';


--
-- Name: COLUMN account.id_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.account.id_token IS 'The id token returned from the provider';


--
-- Name: COLUMN account.access_token_expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.account.access_token_expires_at IS 'The time when the access token expires';


--
-- Name: COLUMN account.refresh_token_expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.account.refresh_token_expires_at IS 'The time when the refresh token expires';


--
-- Name: COLUMN account.scope; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.account.scope IS 'The scope of the account. Returned by the provider';


--
-- Name: COLUMN account.password; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.account.password IS 'The password of the account. Mainly used for email and password authentication';


--
-- Name: COLUMN account.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.account.created_at IS 'The time when the account was created';


--
-- Name: COLUMN account.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.account.updated_at IS 'The time when the account was last updated';


--
-- Name: credential; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credential (
    id text NOT NULL,
    user_id text NOT NULL,
    provider text NOT NULL,
    provider_account_id text,
    email text,
    label text,
    tokens jsonb NOT NULL,
    "primary" boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: COLUMN credential.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.credential.id IS 'Unique identifier for each credential';


--
-- Name: COLUMN credential.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.credential.user_id IS 'The id of the user who owns this credential';


--
-- Name: COLUMN credential.provider; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.credential.provider IS 'The authentication provider name';


--
-- Name: COLUMN credential.provider_account_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.credential.provider_account_id IS 'The account id from the provider';


--
-- Name: COLUMN credential.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.credential.email IS 'The email associated with this credential';


--
-- Name: COLUMN credential.label; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.credential.label IS 'A user-friendly label for this credential';


--
-- Name: COLUMN credential.tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.credential.tokens IS 'JSON object containing provider tokens';


--
-- Name: COLUMN credential."primary"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.credential."primary" IS 'Whether this is the primary credential for the user';


--
-- Name: COLUMN credential.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.credential.created_at IS 'The time when the credential was created';


--
-- Name: COLUMN credential.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.credential.updated_at IS 'The time when the credential was last updated';


--
-- Name: owner_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.owner_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    owner_id uuid NOT NULL,
    user_id text NOT NULL,
    role text DEFAULT 'member'::text NOT NULL
);


--
-- Name: TABLE owner_memberships; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.owner_memberships IS 'Links users to owners (organizations) with membership roles';


--
-- Name: COLUMN owner_memberships.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.owner_memberships.id IS 'Unique identifier for each owner membership';


--
-- Name: COLUMN owner_memberships.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.owner_memberships.created_at IS 'Creation timestamp';


--
-- Name: COLUMN owner_memberships.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.owner_memberships.updated_at IS 'Update timestamp (auto-managed by trigger)';


--
-- Name: COLUMN owner_memberships.owner_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.owner_memberships.owner_id IS 'FK to owners.id that this membership grants access to';


--
-- Name: COLUMN owner_memberships.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.owner_memberships.user_id IS 'FK to users.id that has access to the owner';


--
-- Name: COLUMN owner_memberships.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.owner_memberships.role IS 'Membership role for this owner (e.g., member, admin)';


--
-- Name: owners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.owners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    external_id bigint,
    login public.citext NOT NULL,
    name text,
    type text,
    avatar_url text,
    html_url text,
    installation_id bigint
);


--
-- Name: COLUMN owners.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.owners.id IS 'Unique identifier for each owner';


--
-- Name: COLUMN owners.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.owners.created_at IS 'Creation timestamp';


--
-- Name: COLUMN owners.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.owners.updated_at IS 'Update timestamp (auto-managed by trigger)';


--
-- Name: COLUMN owners.external_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.owners.external_id IS 'External provider id (e.g., GitHub id)';


--
-- Name: COLUMN owners.login; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.owners.login IS 'Owner login/handle (e.g., GitHub login)';


--
-- Name: COLUMN owners.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.owners.name IS 'Display name of the owner';


--
-- Name: COLUMN owners.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.owners.type IS 'Owner type (e.g., user or organization)';


--
-- Name: COLUMN owners.avatar_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.owners.avatar_url IS 'Avatar image URL';


--
-- Name: COLUMN owners.html_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.owners.html_url IS 'HTML profile URL';


--
-- Name: pgmigrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pgmigrations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    run_on timestamp without time zone NOT NULL
);


--
-- Name: pgmigrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pgmigrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pgmigrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pgmigrations_id_seq OWNED BY public.pgmigrations.id;


--
-- Name: repo_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.repo_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    repo_id uuid NOT NULL,
    user_id text NOT NULL,
    role text DEFAULT 'member'::text NOT NULL
);


--
-- Name: TABLE repo_memberships; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.repo_memberships IS 'Links users to individual repositories with membership roles';


--
-- Name: COLUMN repo_memberships.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.repo_memberships.id IS 'Unique identifier for each repo membership';


--
-- Name: COLUMN repo_memberships.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.repo_memberships.created_at IS 'Creation timestamp';


--
-- Name: COLUMN repo_memberships.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.repo_memberships.updated_at IS 'Update timestamp (auto-managed by trigger)';


--
-- Name: COLUMN repo_memberships.repo_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.repo_memberships.repo_id IS 'FK to repos.id that this membership grants access to';


--
-- Name: COLUMN repo_memberships.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.repo_memberships.user_id IS 'FK to users.id that has access to the repo';


--
-- Name: COLUMN repo_memberships.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.repo_memberships.role IS 'Membership role for this repo (e.g., member, admin)';


--
-- Name: repos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.repos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    external_id bigint,
    name public.citext NOT NULL,
    full_name public.citext,
    private boolean DEFAULT false NOT NULL,
    description text,
    default_branch text,
    html_url text,
    enabled boolean DEFAULT false NOT NULL
);


--
-- Name: COLUMN repos.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.repos.id IS 'Unique identifier for each repository';


--
-- Name: COLUMN repos.owner_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.repos.owner_id IS 'FK to owners.id of the repository owner';


--
-- Name: COLUMN repos.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.repos.created_at IS 'Creation timestamp';


--
-- Name: COLUMN repos.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.repos.updated_at IS 'Update timestamp (auto-managed by trigger)';


--
-- Name: COLUMN repos.external_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.repos.external_id IS 'External provider id (e.g., GitHub repo id)';


--
-- Name: COLUMN repos.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.repos.name IS 'Short repository name';


--
-- Name: COLUMN repos.full_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.repos.full_name IS 'Fully qualified name (e.g., owner/name)';


--
-- Name: COLUMN repos.private; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.repos.private IS 'Whether the repository is private';


--
-- Name: COLUMN repos.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.repos.description IS 'Repository description';


--
-- Name: COLUMN repos.default_branch; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.repos.default_branch IS 'Default branch name';


--
-- Name: COLUMN repos.html_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.repos.html_url IS 'HTML repository URL';


--
-- Name: runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    repo_id uuid NOT NULL,
    commit_sha text,
    branch_name text NOT NULL,
    commit_message text,
    pr_number text,
    status text NOT NULL,
    summary text,
    stories jsonb DEFAULT '[]'::jsonb NOT NULL,
    number integer NOT NULL,
    git_author jsonb,
    ext_trigger_dev jsonb,
    CONSTRAINT runs_status_check CHECK ((status = ANY (ARRAY['pass'::text, 'fail'::text, 'skipped'::text, 'running'::text, 'error'::text])))
);


--
-- Name: COLUMN runs.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.runs.id IS 'Unique identifier for each run';


--
-- Name: COLUMN runs.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.runs.created_at IS 'The time when the run was created';


--
-- Name: COLUMN runs.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.runs.updated_at IS 'The time when the run was last updated';


--
-- Name: COLUMN runs.repo_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.runs.repo_id IS 'FK to repos.id of the repository this run belongs to';


--
-- Name: COLUMN runs.commit_sha; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.runs.commit_sha IS 'The SHA of the commit that was tested';


--
-- Name: COLUMN runs.branch_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.runs.branch_name IS 'The branch name this run was executed on';


--
-- Name: COLUMN runs.commit_message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.runs.commit_message IS 'The commit message';


--
-- Name: COLUMN runs.pr_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.runs.pr_number IS 'The pull request number associated with this run';


--
-- Name: COLUMN runs.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.runs.status IS 'The overall status of the run (pass, fail, skipped, running, error)';


--
-- Name: COLUMN runs.summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.runs.summary IS 'Summary of the run execution';


--
-- Name: COLUMN runs.stories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.runs.stories IS 'Array of story execution details with storyId and status';


--
-- Name: COLUMN runs.git_author; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.runs.git_author IS 'Git commit author information stored as JSON: {id, login, name}';


--
-- Name: COLUMN runs.ext_trigger_dev; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.runs.ext_trigger_dev IS 'Trigger.dev run tracking data: {runId: string}';


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    id text NOT NULL,
    user_id text NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: COLUMN session.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.session.id IS 'Unique identifier for each session';


--
-- Name: COLUMN session.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.session.user_id IS 'The id of the user';


--
-- Name: COLUMN session.token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.session.token IS 'The unique session token';


--
-- Name: COLUMN session.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.session.expires_at IS 'The time when the session expires';


--
-- Name: COLUMN session.ip_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.session.ip_address IS 'The IP address of the device';


--
-- Name: COLUMN session.user_agent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.session.user_agent IS 'The user agent information of the device';


--
-- Name: COLUMN session.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.session.created_at IS 'The time when the session was created';


--
-- Name: COLUMN session.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.session.updated_at IS 'The time when the session was last updated';


--
-- Name: stories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    repo_id uuid NOT NULL,
    name text NOT NULL,
    story text NOT NULL,
    decomposition jsonb,
    state public.story_state DEFAULT 'active'::public.story_state NOT NULL,
    metadata jsonb
);


--
-- Name: COLUMN stories.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stories.id IS 'Unique identifier for each story';


--
-- Name: COLUMN stories.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stories.created_at IS 'The time when the story was created';


--
-- Name: COLUMN stories.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stories.updated_at IS 'The time when the story was last updated';


--
-- Name: COLUMN stories.repo_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stories.repo_id IS 'FK to repos.id of the repository this story belongs to';


--
-- Name: COLUMN stories.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stories.name IS 'The title/name of the story';


--
-- Name: COLUMN stories.story; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stories.story IS 'The Gherkin story text';


--
-- Name: COLUMN stories.decomposition; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stories.decomposition IS 'Structured decomposition result containing steps (given preconditions and requirements with assertions)';


--
-- Name: COLUMN stories.state; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stories.state IS 'The current state of the story: active (should be tested), generated (AI generated, needs approval), paused (dont test in CI), archived (dont test and hide from UI), planned (planned feature, dont test yet)';


--
-- Name: COLUMN stories.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stories.metadata IS 'Additional JSON metadata for the story';


--
-- Name: story_evidence_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.story_evidence_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    branch_name text NOT NULL,
    story_id uuid NOT NULL,
    commit_sha text NOT NULL,
    cache_data jsonb NOT NULL,
    run_id uuid
);


--
-- Name: TABLE story_evidence_cache; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.story_evidence_cache IS 'Cache of file hashes for story evaluation evidence to avoid re-running CI when files unchanged';


--
-- Name: COLUMN story_evidence_cache.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.story_evidence_cache.id IS 'Unique identifier for each cache entry';


--
-- Name: COLUMN story_evidence_cache.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.story_evidence_cache.created_at IS 'The time when the cache entry was created';


--
-- Name: COLUMN story_evidence_cache.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.story_evidence_cache.updated_at IS 'The time when the cache entry was last updated';


--
-- Name: COLUMN story_evidence_cache.branch_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.story_evidence_cache.branch_name IS 'The branch name this cache entry is for';


--
-- Name: COLUMN story_evidence_cache.story_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.story_evidence_cache.story_id IS 'FK to stories.id of the story this cache belongs to';


--
-- Name: COLUMN story_evidence_cache.commit_sha; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.story_evidence_cache.commit_sha IS 'The commit SHA this cache entry is for - allows keeping cache from older states';


--
-- Name: COLUMN story_evidence_cache.cache_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.story_evidence_cache.cache_data IS 'Nested structure: { steps: { "0": { assertions: { "0": { filename: hash } } } } }';


--
-- Name: COLUMN story_evidence_cache.run_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.story_evidence_cache.run_id IS 'FK to runs.id - metadata about which run produced this cache';


--
-- Name: story_test_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.story_test_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    story_id uuid NOT NULL,
    run_id uuid,
    status text NOT NULL,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    duration_ms integer,
    analysis jsonb,
    analysis_version integer NOT NULL,
    ext_trigger_dev jsonb,
    CONSTRAINT story_test_results_status_check CHECK ((status = ANY (ARRAY['pass'::text, 'fail'::text, 'running'::text, 'error'::text])))
);


--
-- Name: TABLE story_test_results; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.story_test_results IS 'Detailed AI evaluation results for individual repository stories';


--
-- Name: COLUMN story_test_results.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.story_test_results.id IS 'Unique identifier for each story test result';


--
-- Name: COLUMN story_test_results.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.story_test_results.created_at IS 'The time when the test result was created';


--
-- Name: COLUMN story_test_results.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.story_test_results.updated_at IS 'The time when the test result was last updated';


--
-- Name: COLUMN story_test_results.story_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.story_test_results.story_id IS 'FK to stories.id of the evaluated story';


--
-- Name: COLUMN story_test_results.run_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.story_test_results.run_id IS 'Optional FK to runs.id when the test was executed as part of a CI run';


--
-- Name: COLUMN story_test_results.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.story_test_results.status IS 'Outcome status of the evaluation (pass, fail, running, error)';


--
-- Name: COLUMN story_test_results.started_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.story_test_results.started_at IS 'Timestamp when the evaluation began';


--
-- Name: COLUMN story_test_results.completed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.story_test_results.completed_at IS 'Timestamp when the evaluation finished';


--
-- Name: COLUMN story_test_results.duration_ms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.story_test_results.duration_ms IS 'Total evaluation duration in milliseconds';


--
-- Name: COLUMN story_test_results.analysis; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.story_test_results.analysis IS 'Versioned story analysis payload containing conclusion, evidence, and explanation.';


--
-- Name: COLUMN story_test_results.analysis_version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.story_test_results.analysis_version IS 'Version number of the stored analysis payload.';


--
-- Name: COLUMN story_test_results.ext_trigger_dev; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.story_test_results.ext_trigger_dev IS 'Trigger.dev run tracking data: {runId: string}';


--
-- Name: user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."user" (
    id text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status public.user_status DEFAULT 'active'::public.user_status NOT NULL,
    name text,
    email text,
    email_verified boolean DEFAULT false NOT NULL,
    image text,
    last_interaction_at timestamp with time zone,
    time_zone text
);


--
-- Name: COLUMN "user".id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".id IS 'Unique identifier for each user';


--
-- Name: COLUMN "user".created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".created_at IS 'The time when the user was created';


--
-- Name: COLUMN "user".updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".updated_at IS 'The time when the user was last updated';


--
-- Name: COLUMN "user".status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".status IS 'The current status of the user account';


--
-- Name: COLUMN "user".name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".name IS 'The display name of the user';


--
-- Name: COLUMN "user".email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".email IS 'The email address of the user';


--
-- Name: COLUMN "user".email_verified; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".email_verified IS 'Whether the user email is verified';


--
-- Name: COLUMN "user".image; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".image IS 'The image URL of the user';


--
-- Name: COLUMN "user".last_interaction_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".last_interaction_at IS 'The time when the user last interacted with the system';


--
-- Name: COLUMN "user".time_zone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."user".time_zone IS 'The user preferred timezone';


--
-- Name: verification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: COLUMN verification.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.verification.id IS 'Unique identifier for each verification';


--
-- Name: COLUMN verification.identifier; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.verification.identifier IS 'The identifier for the verification request';


--
-- Name: COLUMN verification.value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.verification.value IS 'The value to be verified';


--
-- Name: COLUMN verification.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.verification.expires_at IS 'The time when the verification request expires';


--
-- Name: COLUMN verification.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.verification.created_at IS 'The time when the verification was created';


--
-- Name: COLUMN verification.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.verification.updated_at IS 'The time when the verification was last updated';


--
-- Name: pgmigrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pgmigrations ALTER COLUMN id SET DEFAULT nextval('public.pgmigrations_id_seq'::regclass);


--
-- Name: account accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: credential credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credential
    ADD CONSTRAINT credentials_pkey PRIMARY KEY (id);


--
-- Name: owner_memberships owner_memberships_owner_user_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.owner_memberships
    ADD CONSTRAINT owner_memberships_owner_user_unique UNIQUE (owner_id, user_id);


--
-- Name: owner_memberships owner_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.owner_memberships
    ADD CONSTRAINT owner_memberships_pkey PRIMARY KEY (id);


--
-- Name: owners owners_external_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.owners
    ADD CONSTRAINT owners_external_id_unique UNIQUE (external_id);


--
-- Name: owners owners_login_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.owners
    ADD CONSTRAINT owners_login_unique UNIQUE (login);


--
-- Name: owners owners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.owners
    ADD CONSTRAINT owners_pkey PRIMARY KEY (id);


--
-- Name: pgmigrations pgmigrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pgmigrations
    ADD CONSTRAINT pgmigrations_pkey PRIMARY KEY (id);


--
-- Name: repo_memberships repo_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repo_memberships
    ADD CONSTRAINT repo_memberships_pkey PRIMARY KEY (id);


--
-- Name: repo_memberships repo_memberships_repo_user_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repo_memberships
    ADD CONSTRAINT repo_memberships_repo_user_unique UNIQUE (repo_id, user_id);


--
-- Name: repos repos_external_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repos
    ADD CONSTRAINT repos_external_id_unique UNIQUE (external_id);


--
-- Name: repos repos_owner_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repos
    ADD CONSTRAINT repos_owner_name_unique UNIQUE (owner_id, name);


--
-- Name: repos repos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repos
    ADD CONSTRAINT repos_pkey PRIMARY KEY (id);


--
-- Name: runs runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.runs
    ADD CONSTRAINT runs_pkey PRIMARY KEY (id);


--
-- Name: session sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: session sessions_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT sessions_token_key UNIQUE (token);


--
-- Name: stories stories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stories
    ADD CONSTRAINT stories_pkey PRIMARY KEY (id);


--
-- Name: story_evidence_cache story_evidence_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_evidence_cache
    ADD CONSTRAINT story_evidence_cache_pkey PRIMARY KEY (id);


--
-- Name: story_test_results story_test_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_test_results
    ADD CONSTRAINT story_test_results_pkey PRIMARY KEY (id);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: user users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);


--
-- Name: owner_memberships_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX owner_memberships_user_id_idx ON public.owner_memberships USING btree (user_id);


--
-- Name: owners_installation_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX owners_installation_id_unique ON public.owners USING btree (installation_id) WHERE (installation_id IS NOT NULL);


--
-- Name: repo_memberships_repo_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX repo_memberships_repo_id_idx ON public.repo_memberships USING btree (repo_id);


--
-- Name: repo_memberships_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX repo_memberships_user_id_idx ON public.repo_memberships USING btree (user_id);


--
-- Name: runs_branch_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX runs_branch_name_idx ON public.runs USING btree (branch_name);


--
-- Name: runs_commit_sha_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX runs_commit_sha_idx ON public.runs USING btree (commit_sha);


--
-- Name: runs_repo_commit_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX runs_repo_commit_idx ON public.runs USING btree (repo_id, commit_sha);


--
-- Name: runs_repo_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX runs_repo_id_idx ON public.runs USING btree (repo_id);


--
-- Name: runs_repo_id_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX runs_repo_id_number_idx ON public.runs USING btree (repo_id, number);


--
-- Name: runs_repo_id_number_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX runs_repo_id_number_unique_idx ON public.runs USING btree (repo_id, number);


--
-- Name: runs_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX runs_status_idx ON public.runs USING btree (status);


--
-- Name: stories_repo_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stories_repo_id_idx ON public.stories USING btree (repo_id);


--
-- Name: stories_repo_id_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stories_repo_id_state_idx ON public.stories USING btree (repo_id, state) WHERE (state = 'active'::public.story_state);


--
-- Name: story_evidence_cache_branch_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX story_evidence_cache_branch_name_idx ON public.story_evidence_cache USING btree (branch_name);


--
-- Name: story_evidence_cache_commit_sha_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX story_evidence_cache_commit_sha_idx ON public.story_evidence_cache USING btree (commit_sha);


--
-- Name: story_evidence_cache_run_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX story_evidence_cache_run_id_idx ON public.story_evidence_cache USING btree (run_id);


--
-- Name: story_evidence_cache_story_commit_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX story_evidence_cache_story_commit_unique_idx ON public.story_evidence_cache USING btree (story_id, commit_sha);


--
-- Name: story_evidence_cache_story_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX story_evidence_cache_story_id_idx ON public.story_evidence_cache USING btree (story_id);


--
-- Name: story_test_results_run_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX story_test_results_run_id_idx ON public.story_test_results USING btree (run_id);


--
-- Name: story_test_results_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX story_test_results_status_idx ON public.story_test_results USING btree (status);


--
-- Name: story_test_results_story_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX story_test_results_story_id_idx ON public.story_test_results USING btree (story_id);


--
-- Name: owners normalize_owner_login_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER normalize_owner_login_trigger BEFORE INSERT OR UPDATE ON public.owners FOR EACH ROW EXECUTE FUNCTION public.normalize_owner_login();


--
-- Name: repos normalize_repo_fields_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER normalize_repo_fields_trigger BEFORE INSERT OR UPDATE ON public.repos FOR EACH ROW EXECUTE FUNCTION public.normalize_repo_fields();


--
-- Name: runs set_run_number_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_run_number_trigger BEFORE INSERT ON public.runs FOR EACH ROW EXECUTE FUNCTION public.set_run_number();


--
-- Name: account set_timestamp_account; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_account BEFORE UPDATE ON public.account FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: owner_memberships set_timestamp_owner_memberships; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_owner_memberships BEFORE UPDATE ON public.owner_memberships FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: owners set_timestamp_owners; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_owners BEFORE UPDATE ON public.owners FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: repo_memberships set_timestamp_repo_memberships; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_repo_memberships BEFORE UPDATE ON public.repo_memberships FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: repos set_timestamp_repos; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_repos BEFORE UPDATE ON public.repos FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: runs set_timestamp_runs; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_runs BEFORE UPDATE ON public.runs FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: session set_timestamp_session; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_session BEFORE UPDATE ON public.session FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: stories set_timestamp_stories; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_stories BEFORE UPDATE ON public.stories FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: story_evidence_cache set_timestamp_story_evidence_cache; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_story_evidence_cache BEFORE UPDATE ON public.story_evidence_cache FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: story_test_results set_timestamp_story_test_results; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_story_test_results BEFORE UPDATE ON public.story_test_results FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: user set_timestamp_user; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_user BEFORE UPDATE ON public."user" FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: verification set_timestamp_verifications; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_verifications BEFORE UPDATE ON public.verification FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: credential update_credential_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_credential_timestamp BEFORE UPDATE ON public.credential FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: account account_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: credential credential_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credential
    ADD CONSTRAINT credential_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: owner_memberships owner_memberships_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.owner_memberships
    ADD CONSTRAINT owner_memberships_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.owners(id) ON DELETE CASCADE;


--
-- Name: owner_memberships owner_memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.owner_memberships
    ADD CONSTRAINT owner_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: repo_memberships repo_memberships_repo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repo_memberships
    ADD CONSTRAINT repo_memberships_repo_id_fkey FOREIGN KEY (repo_id) REFERENCES public.repos(id) ON DELETE CASCADE;


--
-- Name: repo_memberships repo_memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repo_memberships
    ADD CONSTRAINT repo_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: repos repos_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repos
    ADD CONSTRAINT repos_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.owners(id) ON DELETE CASCADE;


--
-- Name: runs runs_repo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.runs
    ADD CONSTRAINT runs_repo_id_fkey FOREIGN KEY (repo_id) REFERENCES public.repos(id) ON DELETE CASCADE;


--
-- Name: session session_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: stories stories_repo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stories
    ADD CONSTRAINT stories_repo_id_fkey FOREIGN KEY (repo_id) REFERENCES public.repos(id) ON DELETE CASCADE;


--
-- Name: story_evidence_cache story_evidence_cache_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_evidence_cache
    ADD CONSTRAINT story_evidence_cache_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.runs(id) ON DELETE SET NULL;


--
-- Name: story_evidence_cache story_evidence_cache_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_evidence_cache
    ADD CONSTRAINT story_evidence_cache_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: story_test_results story_test_results_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_test_results
    ADD CONSTRAINT story_test_results_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.runs(id) ON DELETE SET NULL;


--
-- Name: story_test_results story_test_results_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_test_results
    ADD CONSTRAINT story_test_results_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 2UfAb9FrSgxGgEhyNQQsvFCrhCeTHRx428GiSJSYemuI4Dj3yTzIhUYbEzP4Lny

