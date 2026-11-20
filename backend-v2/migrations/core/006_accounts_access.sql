-- Accounts, registration and access (spec docs/specs/accounts-access.md AC3, AC4, AC6, AC8, AC11).

-- AC3/AC4: sign-in by Google or email; the mobile is filled in "Your details" (unique when present).
ALTER TABLE users ALTER COLUMN mobile DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_uq ON users (lower(email)) WHERE email IS NOT NULL;

-- AC6/AC7: a person asks to become an admin; only super-admins decide.
CREATE TABLE IF NOT EXISTS access_requests (
  id uuid PRIMARY KEY DEFAULT uuid_v7(),
  user_id uuid NOT NULL REFERENCES users(id),
  kind text NOT NULL DEFAULT 'admin' CHECK (kind IN ('admin')),
  party_id uuid REFERENCES parties(id),
  party_name text NOT NULL,
  state_code char(2) NOT NULL REFERENCES states(code),
  whole_state boolean NOT NULL DEFAULT false,
  ac_nos smallint[] NOT NULL DEFAULT '{}',
  designation text NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','withdrawn')),
  decided_by uuid REFERENCES users(id),
  decided_at timestamptz,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (whole_state OR cardinality(ac_nos) >= 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS access_requests_open ON access_requests (user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS access_requests_status ON access_requests (status, created_at);

-- AC8: whole-state admin access. Memberships are created for every customer of the party in the state
-- (source = 'state'), including customers created later.
CREATE TABLE IF NOT EXISTS admin_scopes (
  id uuid PRIMARY KEY DEFAULT uuid_v7(),
  user_id uuid NOT NULL REFERENCES users(id),
  party_id uuid NOT NULL REFERENCES parties(id),
  state_code char(2) NOT NULL REFERENCES states(code),
  granted_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS admin_scopes_active ON admin_scopes (user_id, party_id, state_code) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS admin_scopes_party_state ON admin_scopes (party_id, state_code) WHERE revoked_at IS NULL;

ALTER TABLE memberships ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'direct' CHECK (source IN ('direct','state'));
