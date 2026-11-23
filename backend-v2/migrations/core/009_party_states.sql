-- spec party-states: the states a party works in. A party with no rows is national (shown in every state).
CREATE TABLE party_states (
  party_id uuid NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  state_code char(2) NOT NULL REFERENCES states(code) ON DELETE CASCADE,
  PRIMARY KEY (party_id, state_code)
);
CREATE INDEX party_states_state ON party_states (state_code);
