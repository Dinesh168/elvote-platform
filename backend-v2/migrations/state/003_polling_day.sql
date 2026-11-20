-- Polling day (spec docs/specs/polling-day.md S1, S2): elections per state, optionally for some ACs, with a time window.
ALTER TABLE elections
  ADD COLUMN IF NOT EXISTS ac_nos smallint[],                       -- NULL = every AC in the state
  ADD COLUMN IF NOT EXISTS opens_at time NOT NULL DEFAULT '05:00',  -- India time
  ADD COLUMN IF NOT EXISTS closes_at time NOT NULL DEFAULT '19:00',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE elections DROP CONSTRAINT IF EXISTS elections_status_check;
ALTER TABLE elections ADD CONSTRAINT elections_status_check CHECK (status IN ('upcoming','polling','done','cancelled'));
ALTER TABLE elections ADD CONSTRAINT elections_window_check CHECK (closes_at > opens_at);
CREATE INDEX IF NOT EXISTS elections_poll_date ON elections (poll_date) WHERE status <> 'cancelled';

ALTER TABLE booths DROP CONSTRAINT IF EXISTS booths_location_source_check;
ALTER TABLE booths ADD CONSTRAINT booths_location_source_check CHECK (location_source IN ('upload','gps','edited'));
