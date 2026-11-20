-- Polling day (spec docs/specs/polling-day.md S3, V2, A1, O1).
ALTER TABLE party_constituencies
  ADD COLUMN IF NOT EXISTS booth_radius_m smallint NOT NULL DEFAULT 300 CHECK (booth_radius_m BETWEEN 50 AND 2000);

-- Latest position and status per volunteer (no trail). Deleted 30 days after the poll date.
CREATE TABLE field_presence (
  membership_id uuid PRIMARY KEY REFERENCES memberships(id) ON DELETE CASCADE,
  party_constituency_id uuid NOT NULL REFERENCES party_constituencies(id),
  election_id uuid NOT NULL,
  poll_date date NOT NULL,
  permission text NOT NULL CHECK (permission IN ('granted','foreground','denied','off')),
  status text NOT NULL CHECK (status IN ('checking','at_booth','away','location_off','no_booth_location')),
  lat numeric(9,6),
  lng numeric(9,6),
  accuracy_m int,
  distance_m int,
  part_no smallint,
  reading_at timestamptz,          -- phone time of the last usable reading
  over_count smallint NOT NULL DEFAULT 0,
  over_since timestamptz,          -- phone time of the first reading beyond the distance
  away_since timestamptz,
  still_alerted boolean NOT NULL DEFAULT false,
  reported_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX field_presence_pc ON field_presence (party_constituency_id, poll_date);
CREATE INDEX field_presence_away ON field_presence (away_since) WHERE status = 'away' AND NOT still_alerted;

-- Status changes only (alerts).
CREATE TABLE presence_events (
  id uuid PRIMARY KEY DEFAULT uuid_v7(),
  party_constituency_id uuid NOT NULL REFERENCES party_constituencies(id),
  membership_id uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  poll_date date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('left','still_away','returned','location_off','location_on')),
  part_no smallint,
  distance_m int,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX presence_events_pc ON presence_events (party_constituency_id, at DESC);
CREATE INDEX presence_events_date ON presence_events (poll_date);

-- Each admin's "seen up to" for the alert badge.
CREATE TABLE presence_seen (
  membership_id uuid PRIMARY KEY REFERENCES memberships(id) ON DELETE CASCADE,
  seen_at timestamptz NOT NULL
);

-- Phone push tokens (Expo). One person may have several phones.
CREATE TABLE push_tokens (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('android','ios','web')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX push_tokens_user ON push_tokens (user_id);

-- Each event is pushed once (set when it is sent).
ALTER TABLE presence_events ADD COLUMN pushed_at timestamptz;
