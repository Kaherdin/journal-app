-- Étape 1: Renommer l'ancienne colonne gratitude en gratitude_old
ALTER TABLE journal_entries RENAME COLUMN gratitude TO gratitude_old;

-- Étape 2: Créer une nouvelle colonne de type jsonb
ALTER TABLE journal_entries ADD COLUMN gratitude jsonb DEFAULT '[]'::jsonb;

-- Note: Une fois que l'application a été mise à jour pour utiliser la nouvelle colonne,
-- vous pourrez supprimer l'ancienne colonne si nécessaire avec:
-- ALTER TABLE journal_entries DROP COLUMN gratitude_old;
