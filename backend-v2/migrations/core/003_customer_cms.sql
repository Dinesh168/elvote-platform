-- Customer settings set by the super-admin (spec docs/specs/customer-cms.md).
ALTER TABLE party_constituencies
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS candidate_slogan text,
  ADD COLUMN IF NOT EXISTS candidate_message text,
  ADD COLUMN IF NOT EXISTS slip_share_text text,
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '{"map":true,"poll":true,"zones":true,"tasks":true,"slip":true,"surnames":true,"help":true,"boothGps":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{en,pa}',
  ADD COLUMN IF NOT EXISTS max_volunteers int CHECK (max_volunteers IS NULL OR max_volunteers >= 0),
  ADD COLUMN IF NOT EXISTS max_admins int CHECK (max_admins IS NULL OR max_admins >= 1),
  ADD COLUMN IF NOT EXISTS valid_until date;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS blocked_reason text;
