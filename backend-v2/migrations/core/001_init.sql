-- Central database: people, parties, permissions, shard map, audit.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- UUID v7 (time-ordered). PostgreSQL 16 has no built-in uuidv7().
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

CREATE TABLE shards (
  id uuid PRIMARY KEY DEFAULT uuid_v7(),
  name text NOT NULL UNIQUE,
  host_ref text NOT NULL,                       -- name of the env var holding the connection string
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','read_only','moving')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE states (
  code char(2) PRIMARY KEY,
  state_no smallint NOT NULL UNIQUE,            -- census code, also the id prefix in the state DB
  name text NOT NULL,
  name_local text,
  regional_lang text NOT NULL DEFAULT 'hi',
  shard_id uuid NOT NULL REFERENCES shards(id)
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_v7(),
  mobile varchar(15) NOT NULL UNIQUE,
  firebase_uid text UNIQUE,
  name text NOT NULL,
  epic varchar(20),
  lang text NOT NULL DEFAULT 'en',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE platform_admins (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE TABLE parties (
  id uuid PRIMARY KEY DEFAULT uuid_v7(),
  name text NOT NULL,
  short_name text,
  logo_url text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE party_constituencies (
  id uuid PRIMARY KEY DEFAULT uuid_v7(),
  party_id uuid NOT NULL REFERENCES parties(id),
  state_code char(2) NOT NULL REFERENCES states(code),
  ac_no smallint NOT NULL,
  ac_name text NOT NULL,
  max_zones smallint NOT NULL DEFAULT 10 CHECK (max_zones BETWEEN 1 AND 50),
  zone_count smallint NOT NULL DEFAULT 10,
  app_name text,
  candidate_name text,
  candidate_photo_url text,
  ballot_no smallint,
  brand_colour char(7),
  regional_lang text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (zone_count BETWEEN 1 AND max_zones)
);
CREATE UNIQUE INDEX party_constituencies_uq ON party_constituencies (party_id, state_code, ac_no) WHERE deleted_at IS NULL;

CREATE TABLE memberships (
  id uuid PRIMARY KEY DEFAULT uuid_v7(),
  user_id uuid NOT NULL REFERENCES users(id),
  party_constituency_id uuid NOT NULL REFERENCES party_constituencies(id),
  role text NOT NULL CHECK (role IN ('admin','volunteer')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','removed')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid REFERENCES users(id),
  decided_at timestamptz,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, party_constituency_id)
);
CREATE INDEX memberships_pc_status ON memberships (party_constituency_id, status);

CREATE TABLE membership_booths (
  membership_id uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  part_no smallint NOT NULL,                    -- booth part number within the membership's AC
  requested boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES users(id),
  PRIMARY KEY (membership_id, part_no)
);

CREATE TABLE join_codes (
  id uuid PRIMARY KEY DEFAULT uuid_v7(),
  party_constituency_id uuid NOT NULL REFERENCES party_constituencies(id),
  code_hash text NOT NULL UNIQUE,               -- sha256 of the upper-cased code (codes are random, high entropy)
  hint char(2) NOT NULL,
  max_uses int,
  used_count int NOT NULL DEFAULT 0,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT uuid_v7(),
  user_id uuid NOT NULL REFERENCES users(id),
  device text,
  refresh_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE INDEX sessions_user ON sessions (user_id);

CREATE TABLE otp_attempts (
  mobile varchar(15) PRIMARY KEY,
  requests int NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  failures int NOT NULL DEFAULT 0,
  locked_until timestamptz
);

CREATE TABLE audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY,
  at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid,
  actor_role text NOT NULL,
  action text NOT NULL,
  party_id uuid,
  state_code char(2),
  ac_no smallint,
  entity text,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (id, at)
) PARTITION BY RANGE (at);
CREATE TABLE audit_log_default PARTITION OF audit_log DEFAULT;
DO $$
DECLARE m date := date '2026-01-01';
BEGIN
  WHILE m < date '2028-01-01' LOOP
    EXECUTE format('CREATE TABLE audit_log_%s PARTITION OF audit_log FOR VALUES FROM (%L) TO (%L)',
      to_char(m, 'YYYYMM'), m, (m + interval '1 month')::date);
    m := (m + interval '1 month')::date;
  END LOOP;
END $$;
CREATE INDEX audit_log_party_at ON audit_log (party_id, at DESC);
