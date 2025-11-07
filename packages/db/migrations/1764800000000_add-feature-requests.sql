-- Up Migration

CREATE TABLE public.feature_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    vote_count integer DEFAULT 0 NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE public.feature_requests IS 'Upcoming feature requests submitted by users';

COMMENT ON COLUMN public.feature_requests.id IS 'Unique identifier for each feature request';
COMMENT ON COLUMN public.feature_requests.title IS 'Short title for the feature request';
COMMENT ON COLUMN public.feature_requests.description IS 'Detailed description of the feature request';
COMMENT ON COLUMN public.feature_requests.vote_count IS 'Cached total number of user votes';
COMMENT ON COLUMN public.feature_requests.created_by IS 'FK to users.id for the creator of the request';
COMMENT ON COLUMN public.feature_requests.created_at IS 'Creation timestamp';
COMMENT ON COLUMN public.feature_requests.updated_at IS 'Last update timestamp';

ALTER TABLE ONLY public.feature_requests
    ADD CONSTRAINT feature_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.feature_requests
    ADD CONSTRAINT feature_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX feature_requests_title_unique ON public.feature_requests (title);

CREATE TABLE public.feature_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    feature_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE public.feature_votes IS 'Individual user votes for feature requests';

COMMENT ON COLUMN public.feature_votes.id IS 'Unique identifier for each vote';
COMMENT ON COLUMN public.feature_votes.feature_id IS 'FK to feature_requests.id';
COMMENT ON COLUMN public.feature_votes.user_id IS 'FK to users.id for the voter';
COMMENT ON COLUMN public.feature_votes.created_at IS 'Creation timestamp';
COMMENT ON COLUMN public.feature_votes.updated_at IS 'Last update timestamp';

ALTER TABLE ONLY public.feature_votes
    ADD CONSTRAINT feature_votes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.feature_votes
    ADD CONSTRAINT feature_votes_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.feature_requests(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.feature_votes
    ADD CONSTRAINT feature_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX feature_votes_feature_user_unique ON public.feature_votes (feature_id, user_id);

CREATE TRIGGER set_timestamp_feature_requests
BEFORE UPDATE ON public.feature_requests
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

CREATE TRIGGER set_timestamp_feature_votes
BEFORE UPDATE ON public.feature_votes
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Down Migration

DROP TRIGGER set_timestamp_feature_votes ON public.feature_votes;

DROP TRIGGER set_timestamp_feature_requests ON public.feature_requests;

DROP INDEX IF EXISTS public.feature_requests_title_unique;

DROP TABLE public.feature_votes;

DROP TABLE public.feature_requests;

