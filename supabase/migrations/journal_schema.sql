-- Enable the pgvector extension if it's not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the journal_entries table if it doesn't exist
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  mit TEXT NOT NULL,
  content TEXT NOT NULL,
  gratitude TEXT[] NOT NULL,
  notes JSONB NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create the vector similarity search function
CREATE OR REPLACE FUNCTION match_journal_entries(query_embedding VECTOR(1536), match_threshold FLOAT, match_count INT)
RETURNS TABLE (
  id UUID,
  date DATE,
  mit TEXT,
  content TEXT,
  gratitude TEXT[],
  notes JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    journal_entries.id,
    journal_entries.date,
    journal_entries.mit,
    journal_entries.content,
    journal_entries.gratitude,
    journal_entries.notes,
    1 - (journal_entries.embedding <=> query_embedding) AS similarity
  FROM journal_entries
  WHERE 1 - (journal_entries.embedding <=> query_embedding) > match_threshold
  ORDER BY journal_entries.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create the vector cosine index for better search performance
CREATE INDEX IF NOT EXISTS journal_entries_embedding_idx 
ON journal_entries 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
