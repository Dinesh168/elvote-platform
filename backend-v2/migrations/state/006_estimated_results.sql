-- Booths whose past votes were estimated, not read from Form 20 (spec real-demo-data B1).
ALTER TABLE past_booth_results ADD COLUMN IF NOT EXISTS is_estimated boolean NOT NULL DEFAULT false;
