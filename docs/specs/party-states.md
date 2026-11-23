# Parties by state (REQ A1–A3) · status: built (2026-11-23)

Owner (2026-11-23): "based on state it need to show partys right". Confirmed: national parties AAP, INC, BJP, BSP in every state;
a party added from a "not listed" request is linked to that state when approved.

## Requirements
### A1 State first
- Register as admin: State → Party → Assembly → Position. Party is locked ("Choose your state first") until a state is picked;
  changing the state clears the party.

### A2 Parties of the state
- `GET /v1/catalog/parties?state=XX`: national parties (no states set) + parties linked to XX. Without `state`: all.
- Demo: SAD → Punjab, SP → Uttar Pradesh; AAP, INC, BJP, BSP national. *Check:* Punjab shows SAD not SP; UP shows SP not SAD.

### A3 Super-admin sets a party's states
- Parties page: each party shows "National (all states)" or its states; tap → sheet: National, or tick states → Save.
- `PUT /v1/admin/parties/:id/states { states: [] }` (super-admin; [] = national; unknown state 422).
- Approving a request with a new party name links the new party to the request's state.

## Data
- `core.party_states (party_id, state_code)`, PK both, cascade deletes. No rows = national.

## Non-functional
- Audit `party.states`. a11y rows with ✓; en/hi/pa.
