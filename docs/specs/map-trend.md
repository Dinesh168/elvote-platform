# Map & Trend, Win plan and the redesign extras (REQ T1–T6, W1–W2, G1–G4, P1, Q1, Y1) · status: built (2026-11-23)

Owner (2026-11-23), summarised: bring the separate election-trend app (D:\Personal\projects\election-trend) into ElVote for the
admin: map and trend of past elections; the admin only **selects** state, assembly and party, never creates results. Trend at
every level (assembly, zone, booth) with navigation between them. Think as the political leader (win, analyse, manage the team)
and as the volunteer (easy, role-based). Voter slip stays optional. Designs approved: https://claude.ai/artifact/3jixJcLCVeAUxv8x3Xza6J
(rows 3, 5, 6, 9; boards 3.1, 3.8, 5.4, 6.4, 6.8, 9.1–9.5).

## Decisions (confirmed)
| # | Decision |
|---|---|
| D1 | Past results are loaded **only by the super-admin** (CSV upload, election-trend format). Admins read; volunteers see one line about their own booth. |
| D2 | The party selector defaults to the admin's own party (results code matched to the party short name, else name); other parties can be picked to compare. |
| D3 | Map = the same map component as the admin Map page; booths without coordinates are listed under the map. |
| D4 | Every year in the data; levels assembly / zone / booth / village (village only where the CSV has it). Zones are the team's own zones. |
| D5 | Demo gets made-up sample results, marked "Sample data" on screen. |
| D6 | Win plan groups by the last election margin of the selected party: **Safe** won by ≥ 100, **Swing** within 100 either way, **Tough** lost by > 100. |
| D7 | Order: backend T1–T3/W/G/Q/Y → screens row 9 → redesign extras → over-the-air update to the demo after each step. |

## Users & entry points
- Admin: Menu → **Map & Trend**; Menu → **Win plan**; Map → **Past results**; Booth detail → "Last election" card; Insights → "Yesterday" card; Dashboard → Quiet volunteers → **Remind**.
- Volunteer: Home (today ring, streak, rank, "last time in my booth"); Profile (badges); first open → picture tips; Polling day → **Call list**.
- Super-admin: Platform → **Past results** (upload, list, delete a year).

## Requirements

### T1 Past results store (state DB)
- Tables `past_booth_results` (ac_no, year, part_no, booth_name, district, tehsil, village, total_votes, electors, is_sample)
  and `past_party_votes` (ac_no, year, part_no, party_code, votes). One row per booth per year; unique (ac_no, year, part_no).
- Booths are matched to `booths` by (ac_no, part_no) at read time, not by foreign key (rolls change).
- *Given* no results for an assembly, *when* the admin opens Trend, *then* they see "No past results yet" and nothing breaks.

### T2 Super-admin upload
- `POST /v1/admin/past-results` (super-admin only; CSV text, state code). Columns as election-trend CSVs:
  `AC No., POLLING STATION-NUMBER, Polling Station Name, District, Tehsil, Village, <PARTY> Votes…, Total Votes, Current Voters, Year`.
  Every column ending in ` Votes` except `Total Votes` is a party. Missing optional columns are allowed.
- Replaces all rows of each (ac_no, year) in the file inside one transaction (re-upload = correction). Returns rows, ACs, years, parties.
- Bad file (no `AC No.` / `Year` / party columns, non-numeric votes, > 50,000 rows) → `422 invalid_csv` with the first bad line; nothing written.
- `GET /v1/admin/past-results?state=` lists (ac, year, booths, sample); `DELETE /v1/admin/past-results?state=&ac=&year=` removes one. Audit-logged.
- Admins and volunteers calling these get `403`.

### T3 Trend (admin)
- `GET /v1/m/:mid/trend?level=assembly|zone|booth|village&key=&party=` — scoped to the membership's own AC (no AC parameter).
  - `parties`: codes found; `party`: the selected one (default D2).
  - `years[]`: `{ year, total, shares: {code: %}, ours: %, winner: code }` for the selected area.
  - `swing`: ours in the last year minus the year before (points), or null.
  - `children[]` (one level down): assembly → zones (or booths when the team has no zones); zone → its booths; village → its booths;
    each `{ key, name, ours, swing, winner, margin, group }`, where margin = our votes − top other party in the last year.
  - `closeLosses`: booths lost by < 50 votes in the last year.
- Zone membership uses the team's `zone_booths`; booths with results but no zone go under "No zone".

### T4 Results map (admin)
- `GET /v1/m/:mid/results-map?year=&party=` → per booth `{ partNo, name, lat, lng, winner, ours, margin }` + legend counts
  (won, lost, lostUnder50). Booth coordinates come from `booths`.
- App: switch **Who won / Our share**; year switch; tap a booth → card (share, previous year, today's % met) → booth trend.

### T5 Booth: last election
- Booth trend (`level=booth&key=<partNo>`) returns votes by year plus `toWin`: votes needed now ≈ last winner votes + 1 scaled to the
  current roll (`winnerVotes / lastElectors × currentVoters`, rounded up), `oursFound` = current "ours" in the booth, `toGo`.
- Admin Booth detail shows "Last election YEAR: ours X% · won/lost by N" linking to the booth trend.

### T6 Volunteer: my booth last time
- `GET /v1/m/:mid/my-booth-result` (volunteer) → `{ year, partNo, result: 'won'|'lost', margin }` for the volunteer's current booth and
  the team party, or `null`. Never returns other booths or party-wise vote counts. Shown on Home: "Last time we lost here by 40 votes".

### W1 Win plan (admin)
- `GET /v1/m/:mid/win-plan?party=` → `{ year, winnerVotes, needed, oursFound, toGo, groups: {safe, swing, tough} (counts + booth lists), uncoveredSwing: [partNo] }`.
  - `needed` = last winner's assembly votes scaled to the current roll + 1. `oursFound` = assembly "ours" from canvassing.
  - `uncoveredSwing` = swing booths with no approved volunteer.
- Tapping a group opens the booth list filtered to those booths; **Assign** opens Team with the booth preselected.

### W2 Insights links
- Trend card "N booths lost by under 50 votes" → Results map with that filter.

### G1 Today's target ring (volunteer)
- `GET /v1/m/:mid/my-progress` → `{ today, target, streak, rank, teamSize, badges[] }`.
  - today = distinct voters this user marked today (India time); target = team daily target (default 25).
  - streak = consecutive days (ending today or yesterday) with ≥ 1 voter marked.
  - rank = position by voters marked in the last 7 days among the team's approved volunteers.
- Home ring "18/25 today · 7 more to reach today's target"; chips "🔥 5 days in a row", "#4 in team" → Profile.

### G2 Badges
- Earned from the user's own totals: 100 met, 500 met, 50 phones added, 5-day streak. Locked badges show greyed out. Shown on Profile.

### G3 Picture tips
- First open of Home (per device): 3 tips over a dim layer (Meet, colours, sync). Skip / Next; never shown again. App-only (local flag).

### G4 Voter slip optional
- The slip button on Meet is a small optional icon; **Save & next** never opens sharing.

### P1 Polling-day call list
- Polling day → **Call list**: countdown to the election's closing time; list of "ours" (and "needs help") in the volunteer's booth who are
  not marked voted, with a call button when a phone exists, house number otherwise. Uses the existing voters data already on the phone.

### Q1 Remind quiet volunteers
- `POST /v1/m/:mid/remind` (admin) `{ userIds[], template }` → sends the app notification to those volunteers of this team only.
  Templates: `booth_needs_you`, `days_left`, `call_me`. Max once per volunteer per 12 h (429 with the time left otherwise). Audit-logged.

### Y1 Yesterday summary
- `GET /v1/m/:mid/insights` gains `yesterday: { met, metChange, ours, oursChange, bestBooth }` (change vs. the day before, %).

## Data / API changes
- State migration `005_past_results.sql`: the two tables above + indexes (ac_no, year), (ac_no, year, party_code).
- Core migration `008_remind.sql`: `reminders_sent (party_ac_id, user_id, sent_at)` for the 12 h limit; `party_constituencies.daily_target smallint default 25`.
- New endpoints as above; `docs/API.md`, `docs/DATA_MODEL.md`, `docs/FEATURES.md` updated.

## Non-functional requirements
- **Security / tenant isolation:** every admin read is scoped to `m.acNo` of the caller's membership; no AC or state in admin query strings.
  Uploads super-admin only. Bound parameters only. Volunteers get only their own booth's won/lost + margin.
- **Privacy:** results are public aggregate data; no voter rows in these endpoints. Reminders carry no voter data.
- **Performance:** trend/map/win-plan for a 300-booth AC × 4 years < 300 ms p95 on the demo server (single grouped queries, indexes above).
  Upload of 50,000 rows < 10 s (batched inserts).
- **Offline:** analysis screens need the network and say so; the call list and tips work offline.
- **a11y:** charts have text alternatives (`accessibilityLabel` with the numbers); colour is never the only signal (labels "won/lost", rings).
- **i18n:** all new text in en/hi/pa.

## Side menu (owner decision: tabs + side menu)
- ☰ in the top bar opens a left panel with every page of the role, icon + word, grouped by purpose; only the role's own pages; features switched off by the super-admin are hidden.

## Out of scope
- Results scraping from the Election Commission; prediction models; parliament-level trend; editing results by admins.

## Known gaps
- Booths are matched by part number; after a delimitation the old part numbers may not match today's booths (shown as "No match").
