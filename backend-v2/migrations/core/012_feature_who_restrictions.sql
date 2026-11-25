-- spec easy-redesign B3: who gets each feature ({key: 'all'|'admin'|'volunteer'}; missing key = everyone).
ALTER TABLE party_constituencies ADD COLUMN IF NOT EXISTS feature_who jsonb NOT NULL DEFAULT '{}';

-- spec easy-redesign B4: the super-admin pauses one person in one team, or switches off single abilities.
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS paused boolean NOT NULL DEFAULT false;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS deny text[] NOT NULL DEFAULT '{}';
ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_deny_check;
ALTER TABLE memberships ADD CONSTRAINT memberships_deny_check CHECK (deny <@ ARRAY['mark','phones','addPhone','poll']::text[]);
