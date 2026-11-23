# Register as admin: party and position dropdowns (REQ A1–A4) · status: built (2026-11-23)

Owner (2026-11-23): "first party name, then drop down to select party, then assembly selection, position also drop down - he can be
the candidate standing for election or .. you give all the options". Decisions confirmed: order Party → State → Assembly →
Position; position sent in English; all parties shown (not by state); position list as proposed.

## Requirements
### A1 Party dropdown
- `Select` with a search box (list scrolls) of all parties + **"My party is not listed"** → a "Party name" box appears.
- Picking a listed party sends `partyId` + its name; a typed one sends only `partyName` (≥ 2 letters).

### A2 State, then Assembly
- Unchanged (state dropdown, assembly picker); assembly row only after a state is chosen.

### A3 Position dropdown
- Options (code → English sent as `designation`): candidate "Candidate", aspirant "Possible candidate", mla "Sitting MLA",
  exMla "Former MLA / past candidate", mp "MP", stateOb "State office-bearer", districtOb "District president / office-bearer",
  acIncharge "Assembly in-charge", manager "Election / campaign manager", coordinator "Booth / sector coordinator",
  other → "Your position" box (≥ 2 letters, sent as typed). Each option has a one-line "who" subtitle.
- Send is disabled until party, state, area and position are complete.

### A4 Languages and platforms
- Labels en/hi/pa; web and phone; the super-admin sees the English position in Requests (unchanged API).

## Data / API
- None (access request already takes `partyId?`, `partyName`, `designation`).

## Non-functional
- a11y: dropdowns are buttons "label, value"; options are rows with ✓; search box labelled. Keyboard: spec states-keyboard.
