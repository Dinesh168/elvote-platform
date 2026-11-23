-- Remind quiet volunteers (spec docs/specs/map-trend.md Q1) and the volunteer daily target (G1).
CREATE TABLE IF NOT EXISTS reminders_sent (
  party_constituency_id uuid NOT NULL REFERENCES party_constituencies(id),
  user_id uuid NOT NULL REFERENCES users(id),
  sent_by uuid NOT NULL,
  template text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reminders_sent_recent ON reminders_sent (party_constituency_id, user_id, sent_at DESC);
ALTER TABLE party_constituencies ADD COLUMN IF NOT EXISTS daily_target smallint NOT NULL DEFAULT 25 CHECK (daily_target BETWEEN 1 AND 500);
