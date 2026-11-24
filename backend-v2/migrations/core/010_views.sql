-- spec admin-views G2: the levels the super-admin lets this team's admin view by. Default zones only (as before).
ALTER TABLE party_constituencies ADD COLUMN IF NOT EXISTS views text[] NOT NULL DEFAULT '{zone}';
ALTER TABLE party_constituencies DROP CONSTRAINT IF EXISTS party_constituencies_views_check;
ALTER TABLE party_constituencies ADD CONSTRAINT party_constituencies_views_check
  CHECK (cardinality(views) >= 1 AND views <@ ARRAY['zone','area','village']::text[]);
