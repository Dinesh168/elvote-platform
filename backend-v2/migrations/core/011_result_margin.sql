-- spec map-results R1: the close-contest margin (votes) the super-admin sets per team. Won by more = strong / green,
-- lost by more = weak / red, within = close / orange. Default 100 (the old fixed rule), so existing teams do not change.
ALTER TABLE party_constituencies ADD COLUMN IF NOT EXISTS result_margin integer NOT NULL DEFAULT 100;
ALTER TABLE party_constituencies DROP CONSTRAINT IF EXISTS party_constituencies_result_margin_check;
ALTER TABLE party_constituencies ADD CONSTRAINT party_constituencies_result_margin_check CHECK (result_margin BETWEEN 10 AND 2000);
