-- spec easy-redesign B1: "Not living here" counters (moved exists already).
ALTER TABLE stats_booth ADD COLUMN IF NOT EXISTS died int NOT NULL DEFAULT 0;
ALTER TABLE stats_booth ADD COLUMN IF NOT EXISTS not_found int NOT NULL DEFAULT 0;
-- Recount every booth once so the new columns are filled.
INSERT INTO stats_dirty (party_id, booth_id) SELECT party_id, booth_id FROM stats_booth ON CONFLICT DO NOTHING;
