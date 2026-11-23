-- Past election results per booth (spec docs/specs/map-trend.md T1). Loaded only by the super-admin (T2).
-- Booths are matched to `booths` by (ac_no, part_no) at read time: rolls and booth ids change between elections.
CREATE TABLE IF NOT EXISTS past_booth_results (
  ac_no smallint NOT NULL,
  year smallint NOT NULL CHECK (year BETWEEN 1950 AND 2100),
  part_no smallint NOT NULL,
  booth_name text,
  district text,
  tehsil text,
  village text,
  total_votes int NOT NULL DEFAULT 0 CHECK (total_votes >= 0),
  electors int CHECK (electors >= 0),
  is_sample boolean NOT NULL DEFAULT false,
  loaded_by uuid,
  loaded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ac_no, year, part_no)
);
CREATE INDEX IF NOT EXISTS past_booth_results_village ON past_booth_results (ac_no, village);

CREATE TABLE IF NOT EXISTS past_party_votes (
  ac_no smallint NOT NULL,
  year smallint NOT NULL,
  part_no smallint NOT NULL,
  party_code text NOT NULL,
  votes int NOT NULL CHECK (votes >= 0),
  PRIMARY KEY (ac_no, year, part_no, party_code),
  FOREIGN KEY (ac_no, year, part_no) REFERENCES past_booth_results (ac_no, year, part_no) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS past_party_votes_party ON past_party_votes (ac_no, year, party_code);
