-- Up Migration

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to stories table to store OpenAI embedding vector
-- text-embedding-3-small produces 1536-dimensional vectors
ALTER TABLE public.stories ADD COLUMN embedding vector(1536);

COMMENT ON COLUMN public.stories.embedding IS 'OpenAI embedding vector (1536 dimensions) for the story and decomposition, enables similarity search';

-- Down Migration

-- Remove embedding column
ALTER TABLE public.stories DROP COLUMN IF EXISTS embedding;

-- Note: We don't drop the vector extension as it might be used by other tables

