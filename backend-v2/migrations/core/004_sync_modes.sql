-- Sync modes (spec docs/specs/sync-modes.md): set per customer by the super-admin.
ALTER TABLE party_constituencies
  ADD COLUMN IF NOT EXISTS sync_mode text NOT NULL DEFAULT 'live' CHECK (sync_mode IN ('live','offline','scheduled')),
  ADD COLUMN IF NOT EXISTS sync_minutes smallint NOT NULL DEFAULT 15 CHECK (sync_minutes BETWEEN 1 AND 120);

-- S9: last sync and unsent count reported by the volunteer's app at each sync (nothing else is recorded).
ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS unsent int;
