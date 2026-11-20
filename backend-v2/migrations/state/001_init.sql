-- State database (same schema in every state). __STATE_NO__ is replaced by the migrator
-- with the state's census number; big-table ids start at state_no * 2^40, so ids stay unique across servers.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION uuid_v7() RETURNS uuid LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  ms bigint := floor(extract(epoch FROM clock_timestamp()) * 1000);
  b bytea := gen_random_bytes(16);
BEGIN
  b := set_byte(b, 0, ((ms >> 40) & 255)::int);
  b := set_byte(b, 1, ((ms >> 32) & 255)::int);
  b := set_byte(b, 2, ((ms >> 24) & 255)::int);
  b := set_byte(b, 3, ((ms >> 16) & 255)::int);
  b := set_byte(b, 4, ((ms >> 8) & 255)::int);
  b := set_byte(b, 5, (ms & 255)::int);
  b := set_byte(b, 6, (get_byte(b, 6) & 15) | 112);
  b := set_byte(b, 8, (get_byte(b, 8) & 63) | 128);
  RETURN encode(b, 'hex')::uuid;
END $$;

CREATE TABLE state_meta (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  state_no smallint NOT NULL
);
INSERT INTO state_meta (state_no) VALUES (__STATE_NO__);

CREATE SEQUENCE voters_id_seq START WITH __STATE_BASE__ MINVALUE __STATE_BASE__;
CREATE SEQUENCE contact_events_id_seq START WITH __STATE_BASE__ MINVALUE __STATE_BASE__;

CREATE TABLE districts (
  code varchar(5) PRIMARY KEY,
  name text NOT NULL,
  name_local text
);

CREATE TABLE assembly_constituencies (
  ac_no smallint PRIMARY KEY,
  name text NOT NULL,
  name_local text,
  district_code varchar(5) REFERENCES districts(code),
  pc_no smallint,
  reserved text NOT NULL DEFAULT 'GEN' CHECK (reserved IN ('GEN','SC','ST'))
);

CREATE TABLE elections (
  id uuid PRIMARY KEY DEFAULT uuid_v7(),
  kind text NOT NULL CHECK (kind IN ('assembly','parliament','local','bye')),
  name text NOT NULL,
  poll_date date NOT NULL,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','polling','done'))
);

CREATE TABLE booths (
  id uuid PRIMARY KEY DEFAULT uuid_v7(),
  ac_no smallint NOT NULL REFERENCES assembly_constituencies(ac_no),
  part_no smallint NOT NULL,
  name text NOT NULL,
  name_local text,
  locality text,
  address text,
  lat numeric(9,6),
  lng numeric(9,6),
  location_source text CHECK (location_source IN ('upload','gps')),
  location_set_by uuid,
  voters_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (ac_no, part_no)
);

CREATE TABLE roll_versions (
  id uuid PRIMARY KEY DEFAULT uuid_v7(),
  ac_no smallint NOT NULL REFERENCES assembly_constituencies(ac_no),
  source_name text NOT NULL,
  published_on date,
  import_job_id uuid,
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Electoral roll: public data shared by all parties.
CREATE TABLE voters (
  id bigint NOT NULL DEFAULT nextval('voters_id_seq'),
  ac_no smallint NOT NULL,
  part_no smallint NOT NULL,
  booth_id uuid NOT NULL,
  sno int NOT NULL,
  epic varchar(20) NOT NULL,
  name text NOT NULL,
  name_local text,
  relation char(1) NOT NULL DEFAULT 'F' CHECK (relation IN ('F','H','M','O')),
  relative_name text,
  gender char(1) NOT NULL CHECK (gender IN ('M','F','T')),
  age smallint CHECK (age BETWEEN 18 AND 125),
  house_no varchar(30),
  section_no smallint,
  section text,
  mobile varchar(15),
  roll_version_id uuid,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','added','deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ac_no, id),
  UNIQUE (ac_no, epic)
) PARTITION BY LIST (ac_no);
CREATE INDEX voters_part_sno ON voters (ac_no, part_no, sno);
CREATE INDEX voters_part_house ON voters (ac_no, part_no, house_no);
CREATE INDEX voters_age ON voters (ac_no, age);
CREATE INDEX voters_name_trgm ON voters USING gin (name gin_trgm_ops);

-- Restricted: no grants to the API role.
CREATE TABLE voter_sensitive (
  ac_no smallint NOT NULL,
  voter_id bigint NOT NULL,
  caste_category text CHECK (caste_category IN ('GEN','OBC','SC','ST','OTHER')),
  religion text,
  PRIMARY KEY (ac_no, voter_id)
);

-- A party's current status per voter.
CREATE TABLE voter_contacts (
  party_id uuid NOT NULL,
  ac_no smallint NOT NULL,
  voter_id bigint NOT NULL,
  part_no smallint NOT NULL,
  group_code text CHECK (group_code IN ('our','target','opp')),
  residence text NOT NULL DEFAULT 'here' CHECK (residence IN ('here','moved')),
  needs_help boolean NOT NULL DEFAULT false,
  mobile varchar(15),
  first_contacted_at timestamptz,
  last_contacted_at timestamptz,
  last_contacted_by uuid,
  version int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (party_id, ac_no, voter_id)
) PARTITION BY LIST (ac_no);
CREATE INDEX voter_contacts_part ON voter_contacts (party_id, ac_no, part_no);
CREATE INDEX voter_contacts_updated ON voter_contacts (party_id, ac_no, part_no, updated_at);

-- Every change (append-only).
CREATE TABLE contact_events (
  id bigint NOT NULL DEFAULT nextval('contact_events_id_seq'),
  at timestamptz NOT NULL DEFAULT now(),
  client_at timestamptz,
  party_id uuid NOT NULL,
  ac_no smallint NOT NULL,
  part_no smallint NOT NULL,
  voter_id bigint NOT NULL,
  user_id uuid NOT NULL,
  change jsonb NOT NULL,
  source text NOT NULL DEFAULT 'app' CHECK (source IN ('app','import','undo','admin')),
  PRIMARY KEY (id, at)
) PARTITION BY RANGE (at);
CREATE TABLE contact_events_default PARTITION OF contact_events DEFAULT;
DO $$
DECLARE m date := date '2026-01-01';
BEGIN
  WHILE m < date '2028-01-01' LOOP
    EXECUTE format('CREATE TABLE contact_events_%s PARTITION OF contact_events FOR VALUES FROM (%L) TO (%L)',
      to_char(m, 'YYYYMM'), m, (m + interval '1 month')::date);
    m := (m + interval '1 month')::date;
  END LOOP;
END $$;
CREATE INDEX contact_events_party_at ON contact_events (party_id, ac_no, at);
CREATE INDEX contact_events_user_at ON contact_events (party_id, user_id, at);

-- Idempotency: an opId from the phone is applied once.
CREATE TABLE applied_ops (
  op_id uuid PRIMARY KEY,
  party_id uuid NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE poll_marks (
  election_id uuid NOT NULL REFERENCES elections(id),
  party_id uuid NOT NULL,
  ac_no smallint NOT NULL,
  voter_id bigint NOT NULL,
  part_no smallint NOT NULL,
  marked_by uuid NOT NULL,
  marked_at timestamptz NOT NULL DEFAULT now(),
  undone_at timestamptz,
  PRIMARY KEY (election_id, party_id, ac_no, voter_id)
) PARTITION BY LIST (ac_no);
CREATE INDEX poll_marks_part ON poll_marks (party_id, ac_no, part_no);

CREATE TABLE booth_party_info (
  party_id uuid NOT NULL,
  booth_id uuid NOT NULL REFERENCES booths(id),
  strength char(1) NOT NULL DEFAULT 'M' CHECK (strength IN ('S','M','W')),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (party_id, booth_id)
);

CREATE TABLE zones (
  id uuid PRIMARY KEY DEFAULT uuid_v7(),
  party_id uuid NOT NULL,
  ac_no smallint NOT NULL,
  number smallint NOT NULL,
  name text NOT NULL,
  UNIQUE (party_id, ac_no, number)
);

CREATE TABLE zone_booths (
  party_id uuid NOT NULL,
  booth_id uuid NOT NULL REFERENCES booths(id),
  zone_id uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  PRIMARY KEY (party_id, booth_id)
);

CREATE TABLE drives (
  id uuid PRIMARY KEY DEFAULT uuid_v7(),
  party_id uuid NOT NULL,
  ac_no smallint NOT NULL,
  kind text NOT NULL CHECK (kind IN ('women','first_time','young','target','our','senior','migrated','other')),
  custom_name text,
  segment jsonb NOT NULL DEFAULT '{}'::jsonb,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  scope text NOT NULL DEFAULT 'all' CHECK (scope IN ('all','zones','booths')),
  assign text NOT NULL DEFAULT 'all_in_scope' CHECK (assign IN ('all_in_scope','selected')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (ends_on >= starts_on)
);

CREATE TABLE drive_scope (
  drive_id uuid NOT NULL REFERENCES drives(id) ON DELETE CASCADE,
  zone_id uuid REFERENCES zones(id) ON DELETE CASCADE,
  booth_id uuid REFERENCES booths(id),
  CHECK ((zone_id IS NULL) <> (booth_id IS NULL))
);

CREATE TABLE drive_assignees (
  drive_id uuid NOT NULL REFERENCES drives(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  PRIMARY KEY (drive_id, user_id)
);

CREATE TABLE import_jobs (
  id uuid PRIMARY KEY DEFAULT uuid_v7(),
  kind text NOT NULL CHECK (kind IN ('voter_roll','booth_locations')),
  ac_no smallint NOT NULL,
  ac_name text,
  file_name text NOT NULL,
  file_sha256 text NOT NULL,
  rows_total int NOT NULL DEFAULT 0,
  rows_ok int NOT NULL DEFAULT 0,
  rows_failed int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','validating','ready','merging','done','failed','cancelled')),
  message text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

CREATE UNLOGGED TABLE import_staging (
  job_id uuid NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_no int NOT NULL,
  data jsonb NOT NULL,
  error text,
  PRIMARY KEY (job_id, row_no)
);

-- Pre-computed counters per party × booth (dashboards read only these).
CREATE TABLE stats_booth (
  party_id uuid NOT NULL,
  booth_id uuid NOT NULL REFERENCES booths(id),
  ac_no smallint NOT NULL,
  part_no smallint NOT NULL,
  total int NOT NULL DEFAULT 0, met int NOT NULL DEFAULT 0,
  our int NOT NULL DEFAULT 0, target int NOT NULL DEFAULT 0, opp int NOT NULL DEFAULT 0, moved int NOT NULL DEFAULT 0,
  with_mobile int NOT NULL DEFAULT 0, our_mobile int NOT NULL DEFAULT 0, target_mobile int NOT NULL DEFAULT 0, opp_mobile int NOT NULL DEFAULT 0,
  houses int NOT NULL DEFAULT 0, houses_visited int NOT NULL DEFAULT 0, houses_with_mobile int NOT NULL DEFAULT 0,
  our_houses int NOT NULL DEFAULT 0, target_houses int NOT NULL DEFAULT 0, opp_houses int NOT NULL DEFAULT 0,
  first_time int NOT NULL DEFAULT 0, young int NOT NULL DEFAULT 0, mid int NOT NULL DEFAULT 0, senior int NOT NULL DEFAULT 0,
  male int NOT NULL DEFAULT 0, female int NOT NULL DEFAULT 0, third int NOT NULL DEFAULT 0,
  help_needed int NOT NULL DEFAULT 0,
  voted int NOT NULL DEFAULT 0, our_voted int NOT NULL DEFAULT 0, target_voted int NOT NULL DEFAULT 0, opp_voted int NOT NULL DEFAULT 0,
  help_voted int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (party_id, booth_id)
);
CREATE INDEX stats_booth_ac ON stats_booth (party_id, ac_no);

CREATE TABLE stats_booth_daily (
  party_id uuid NOT NULL,
  booth_id uuid NOT NULL REFERENCES booths(id),
  ac_no smallint NOT NULL,
  day date NOT NULL,
  contacted int NOT NULL DEFAULT 0,
  PRIMARY KEY (party_id, booth_id, day)
);
CREATE INDEX stats_booth_daily_ac ON stats_booth_daily (party_id, ac_no, day);

-- Booths whose counters must be recomputed by the worker.
CREATE TABLE stats_dirty (
  party_id uuid NOT NULL,
  booth_id uuid NOT NULL,
  marked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (party_id, booth_id)
);

-- Creates the per-AC partitions. Called when an AC is added (seed, import).
CREATE OR REPLACE FUNCTION ensure_ac(p_ac smallint) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  EXECUTE format('CREATE TABLE IF NOT EXISTS voters_ac%s PARTITION OF voters FOR VALUES IN (%s)', p_ac, p_ac);
  EXECUTE format('CREATE TABLE IF NOT EXISTS voter_contacts_ac%s PARTITION OF voter_contacts FOR VALUES IN (%s)', p_ac, p_ac);
  EXECUTE format('CREATE TABLE IF NOT EXISTS poll_marks_ac%s PARTITION OF poll_marks FOR VALUES IN (%s)', p_ac, p_ac);
END $$;

-- Row-level security: a party only sees its own rows. The API sets app.party_id per transaction;
-- platform-wide jobs (counters, super-admin totals) set app.all_parties = 'on'.
CREATE OR REPLACE FUNCTION party_visible(p uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('app.all_parties', true), '') = 'on'
      OR p::text = coalesce(current_setting('app.party_id', true), '')
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['voter_contacts','contact_events','poll_marks','booth_party_info','zones','zone_booths',
                           'drives','stats_booth','stats_booth_daily','stats_dirty','applied_ops'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY party_only ON %I USING (party_visible(party_id)) WITH CHECK (party_visible(party_id))', t);
  END LOOP;
END $$;
