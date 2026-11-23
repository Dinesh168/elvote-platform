# Real demo data: Punjab AC 50 + UP AC 361, real parties, worked-out booth strength (REQ O1–O5, B1–B3, V1) · status: built (2026-11-23)

Owner (2026-11-23): use UP and Punjab with the real parties of those states; use data from D:\Personal\projects\Elvote-data\2027_data
(trend + voter data) as the sample; booth strength must be worked out from the party of the team that is signed in; booth
locations and English master data from what we already have. All six decisions confirmed as proposed.

## Decisions (confirmed)
| # | Decision |
|---|---|
| D1 | Voter list of AC 50 = the real roll **with identifying details made up**: real booth, section, serial no., house no., age, gender, relation type; made-up name, relative name and EPIC (prefix `ZZD`). No mobiles. |
| D2 | Booth strength is worked out per team; an admin can still set it ("set by you") and **Reset** returns to the worked-out value. |
| D3 | Strong = won the booth by ≥ 100 votes, Moderate = within 100, Weak = lost by > 100 (same as the Win plan). No results → Moderate. |
| D4 | Results loaded: PB AC 50 (2022, `50_data.xlsx`) and UP AC 361 (2022, `up_361_data.xlsx`) only. |
| D5 | Demo reset: made-up parties, teams, voters and canvassing removed (backup first); Haryana keeps its state DB but has no teams or data. Users (sign-ins) are kept. |
| D6 | AC 361 voters are made up (the AC361.xlsx file is damaged) for its 394 real booths. |
| D7 | The ECI captcha-solving scraper is **not** used. Booth locations come from election-trend `ps_coordinates.json`; missing ones are set later by GPS on the spot or by the super-admin's booth location upload. |

## Requirements
### O1 Uttar Pradesh as a state
- `LOCAL_STATES` gains UP (state no. 9, Hindi). Migrations create `elvote_up` (demo: `demo_elvote_up`). *Check:* super-admin state lists show Uttar Pradesh.

### O2 Real parties
- Demo parties: Aam Aadmi Party (AAP), Indian National Congress (INC), Shiromani Akali Dal (SAD), Bharatiya Janata Party (BJP), Samajwadi Party (SP), Bahujan Samaj Party (BSP).
- Demo teams (customers): **AAP – PB AC 50 Rupnagar**, **BJP – UP AC 361 Ballia Nagar**. No admins are created; the super-admin assigns them.

### O3/O5 Real assemblies, booths, English master data
- PB AC 50 Rupnagar: 236 booths with English name, address, village, tehsil from the roll's Parts sheet.
- UP AC 361 Ballia Nagar: 394 booths with English name, address, village from `up_361_data.xlsx`.

### O4 Booth locations
- From `ps_coordinates.json` by (assembly, part no.): PB AC 50 234 of 236, UP AC 361 291 of 394. Others stay without location (`location_source` null).

### B1 Real results
- 2022 booth results with real party codes (AAP, INC, SAD, BJP / BJP, SP, BSP); not sample. Booths whose Punjab 2022 votes were re-estimated
  (election-trend `Data Note` ≠ "2022 Form 20") are flagged `is_estimated` and the booth trend shows "Estimated".

### B3 Booth strength worked out per party
- Dashboard strength counts, booth table, map and booth detail use: admin's own setting if present, else the worked-out value (D3) for the
  team's party, else Moderate. Responses carry `strengthSource: 'admin' | 'auto'`.
- `DELETE /v1/m/:mid/booths/:no/strength` (admin) removes the admin setting.
- *Check:* AAP team AC 50 booth where AAP won by ≥ 100 shows Strong (auto); after the admin sets Weak it shows Weak (set by you); Reset → Strong.

### V1 Voters
- AC 50: 169,377 voters per D1. AC 361: made-up voters (~200 per booth) per D6, marked in the roll source name "Sample voters".

## Non-functional
- Privacy: no real names, relatives, EPIC or mobiles leave the owner's PC; the prepared file contains only the kept fields and is deleted from the
  server after loading. Nothing is committed from 2027_data.
- Safety: loader runs only on `demo_` databases (or local/test) and only with `--demo`; `pg_dump` of every demo DB first.

## Out of scope
- Other 402 UP assemblies; Haryana data; the AC 361 real roll (until re-exported).
