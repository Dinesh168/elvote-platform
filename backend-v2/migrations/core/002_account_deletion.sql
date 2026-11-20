-- Account deletion (spec docs/specs/account-deletion.md): 7-day undo, then the person is erased and the work kept.
ALTER TABLE users ALTER COLUMN mobile DROP NOT NULL;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active','blocked','deleted'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_due_at timestamptz;
CREATE INDEX IF NOT EXISTS users_deletion_due ON users (deletion_due_at) WHERE deletion_due_at IS NOT NULL AND deleted_at IS NULL;
