-- S6 conflicts: phone time per field of the values a contact row holds ({"group": "...", "mobile": "..."}).
-- An older change does not overwrite a newer value of the same field; other fields still apply.
ALTER TABLE voter_contacts ADD COLUMN IF NOT EXISTS field_at jsonb NOT NULL DEFAULT '{}'::jsonb;
