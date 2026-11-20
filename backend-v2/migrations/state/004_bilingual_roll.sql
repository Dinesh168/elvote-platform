-- Bilingual roll data and draft → final roll updates (spec docs/specs/bilingual-roll.md).

-- L1: data language per assembly (NULL = the state's language).
ALTER TABLE assembly_constituencies ADD COLUMN IF NOT EXISTS regional_lang text CHECK (regional_lang IN ('hi','pa'));

-- L2: regional values next to the English ones.
ALTER TABLE voters
  ADD COLUMN IF NOT EXISTS relative_name_local text,
  ADD COLUMN IF NOT EXISTS section_local text,
  ADD COLUMN IF NOT EXISTS is_new boolean NOT NULL DEFAULT false,      -- U5
  ADD COLUMN IF NOT EXISTS prev_part_no smallint,                     -- U4/U8: last booth move
  ADD COLUMN IF NOT EXISTS moved_at timestamptz,
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz;                     -- when it left the roll (U6/U8)
ALTER TABLE booths
  ADD COLUMN IF NOT EXISTS address_local text,
  ADD COLUMN IF NOT EXISTS locality_local text;

-- U6/U7: hidden voters are kept. Visible = 'active' or 'added'.
ALTER TABLE voters DROP CONSTRAINT IF EXISTS voters_status_check;
ALTER TABLE voters ADD CONSTRAINT voters_status_check CHECK (status IN ('active','added','deleted','not_in_roll','moved_out'));

-- U2: find an EPIC in any assembly of the state quickly.
CREATE INDEX IF NOT EXISTS voters_epic ON voters (epic);

-- U1/U9: roll type and date.
ALTER TABLE roll_versions ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'draft' CHECK (kind IN ('draft','final','supplement'));
ALTER TABLE import_jobs
  ADD COLUMN IF NOT EXISTS roll_kind text NOT NULL DEFAULT 'draft' CHECK (roll_kind IN ('draft','final','supplement')),
  ADD COLUMN IF NOT EXISTS published_on date,
  ADD COLUMN IF NOT EXISTS ac_name_local text,
  ADD COLUMN IF NOT EXISTS summary jsonb;

-- U7: rows whose EPIC is visible in another assembly wait for the super-admin.
CREATE TABLE IF NOT EXISTS import_held (
  job_id uuid NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_no int NOT NULL,
  epic varchar(20) NOT NULL,
  other_ac smallint NOT NULL,
  other_voter_id bigint NOT NULL,
  decision text CHECK (decision IN ('move','reject')),
  PRIMARY KEY (job_id, row_no)
);
