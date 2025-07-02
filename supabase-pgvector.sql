-- Activer l'extension pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- S'assurer que la colonne embedding existe dans la table journal_entries
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Créer un index pour accélérer les recherches
CREATE INDEX IF NOT EXISTS journal_entries_embedding_idx 
ON journal_entries
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 1000);

-- Supprimer la fonction existante avant de la recréer
DROP FUNCTION IF EXISTS match_entries(vector(1536), float, integer);

-- Fonction RPC pour chercher les entrées similaires
CREATE OR REPLACE FUNCTION match_entries(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 1000
)
RETURNS TABLE (
  id uuid,
  date text,
  mit text,
  content text,
  prompt text,
  gratitude text[],
  notes jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    journal_entries.id,
    journal_entries.date::text,
    journal_entries.mit,
    journal_entries.content,
    journal_entries.prompt,
    journal_entries.gratitude,
    journal_entries.notes,
    1 - (journal_entries.embedding <=> query_embedding) AS similarity
  FROM journal_entries
  WHERE journal_entries.embedding IS NOT NULL
    AND 1 - (journal_entries.embedding <=> query_embedding) > match_threshold
  ORDER BY journal_entries.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
