-- Étape 1: Ajouter une nouvelle colonne jsonb
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS gratitude_json jsonb;

-- Étape 2: Migrer les données existantes (approche par ligne)
UPDATE journal_entries
SET gratitude_json = CASE
    WHEN gratitude IS NULL THEN NULL
    ELSE to_jsonb(gratitude)
END;

-- Étape 3: Supprimer l'ancienne colonne (optionnel - décommentez après vérification)
-- ALTER TABLE journal_entries DROP COLUMN gratitude;

-- Étape 4: Renommer la nouvelle colonne (optionnel - décommentez après vérification)
-- ALTER TABLE journal_entries RENAME COLUMN gratitude_json TO gratitude;
