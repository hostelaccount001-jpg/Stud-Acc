-- ============================================================================
-- SUPABASE PGVECTOR BIOMETRIC SCHEMA & COSINE SIMILARITY SEARCH RPC
-- Target: Supabase PostgreSQL Database with pgvector extension
-- ============================================================================

-- 1. Enable pgvector Extension for High-Performance Vector Similarity Search
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create Students Master Table with 128-Dimensional Facial Vector Embedding Column
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suid VARCHAR(50) UNIQUE NOT NULL,
    nfc_code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    standard VARCHAR(50) NOT NULL,
    mobile_number VARCHAR(20),
    face_vector vector(128), -- 128-Dimensional Mathematical Face Feature Embedding
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create HNSW (Hierarchical Navigable Small World) Cosine Distance Index for Lightning-Fast Similarity Queries
CREATE INDEX IF NOT EXISTS idx_students_face_vector_cosine 
ON public.students 
USING hnsw (face_vector vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4. Supabase RPC Function: Match Student Face via Cosine Distance Vector Search
-- Parameters:
--   query_embedding: 128-D Float Array extracted from live webcam
--   match_threshold: Maximum Cosine Distance allowed (e.g. 0.40 = 75%+ similarity)
--   match_count: Max number of top matches to return (default 1)

CREATE OR REPLACE FUNCTION public.match_student_face(
    query_embedding vector(128),
    match_threshold FLOAT DEFAULT 0.15, -- Strict 85.0%+ similarity requirement (Cosine Distance <= 0.15)
    match_count INT DEFAULT 1
)
RETURNS TABLE (
    id UUID,
    suid VARCHAR,
    nfc_code VARCHAR,
    name VARCHAR,
    standard VARCHAR,
    mobile_number VARCHAR,
    similarity_score FLOAT,
    distance FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.suid,
        s.nfc_code,
        s.name,
        s.standard,
        s.mobile_number,
        -- Convert Cosine Distance to Similarity Percentage (1.0 - Distance) * 100
        ROUND(((1.0 - (s.face_vector <=> query_embedding)) * 100)::numeric, 2)::FLOAT AS similarity_score,
        (s.face_vector <=> query_embedding)::FLOAT AS distance
    FROM public.students s
    WHERE s.face_vector IS NOT NULL
      -- Filter by Cosine Distance threshold (Lower distance = Closer match)
      AND (s.face_vector <=> query_embedding) <= match_threshold
    ORDER BY s.face_vector <=> query_embedding ASC
    LIMIT match_count;
END;
$$;

-- Grant execution permissions for anonymous and authenticated clients
GRANT EXECUTE ON FUNCTION public.match_student_face(vector(128), FLOAT, INT) TO anon, authenticated, service_role;
