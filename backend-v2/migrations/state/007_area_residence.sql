-- spec admin-views G1: booth area (tehsil / ward from the roll) for "view by Area"; village = booths.locality (exists).
ALTER TABLE booths ADD COLUMN IF NOT EXISTS area text;
CREATE INDEX IF NOT EXISTS booths_area ON booths (ac_no, area);

-- spec admin-views V1: "Died" and "Not found" next to Lives here / Moved.
ALTER TABLE voter_contacts DROP CONSTRAINT IF EXISTS voter_contacts_residence_check;
ALTER TABLE voter_contacts ADD CONSTRAINT voter_contacts_residence_check CHECK (residence IN ('here','moved','died','not_found'));
