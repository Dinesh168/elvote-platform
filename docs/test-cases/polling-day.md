# Test cases: polling day (spec `docs/specs/polling-day.md`)

Status: ⬜ not run · ✅ pass · ❌ fail. api = vitest; unit = Jest; ui = puppeteer (web, geolocation overridden); native = Android build (manual).

| ID | Req | Type | Steps | Expected | Status |
|---|---|---|---|---|---|
| TC-PD-S1-1 | S1 | api | Super-admin creates PB election (all ACs, date in 30 days); volunteer `/v1/me` | `pollingDay` = that election with `radiusM` | ✅ |
| TC-PD-S1-2 | S1 | api | Election for AC 67 only | AC 66 member gets `null` (or the other election); AC 67 member gets it | ✅ |
| TC-PD-S1-3 | S1 | api | Cancel the election | members get `null` | ✅ |
| TC-PD-S1-4 | S1 | api | Past date; closes before opens; second active election same AC + date; admin token | 422; 422; 409 `election_clash`; 403 | ✅ |
| TC-PD-S2-1 | S2 | api | List booths `missing=1`; PATCH one booth; list again | booth listed then gone; source `edited` | ✅ |
| TC-PD-S2-2 | S2 | api | Bulk rows: 1 good, 1 unknown booth, 1 lat 50 — dryRun then save | dryRun saves nothing and reports 2 errors with line numbers; save stores 1 | ✅ |
| TC-PD-S3-1 | S3 | api | Set `boothRadiusM` 500; 40 and 2001 | 200 and `/v1/me` radius 500; 422; 422 | ✅ |
| TC-PD-V2-1 | V2 | api | Report inside radius | status `at_booth`, distance < radius, nearest booth | ✅ |
| TC-PD-V2-2 | V2/A1 | api | Report 650 m away once, then again | 1st: still `at_booth` (1 reading); 2nd: `away`, event `left` | ✅ |
| TC-PD-V2-3 | V2 | api | Report with accuracy 250 m far away | status unchanged; `reported_at` updated | ✅ |
| TC-PD-V2-4 | S3/V2 | api | Radius 500, report 400 m away twice | `at_booth` | ✅ |
| TC-PD-V2-5 | PD8 | api | Volunteer whose booths have no location reports | `no_booth_location`, no event | ✅ |
| TC-PD-A1-1 | A1 | api | Away, then back inside | event `returned` | ✅ |
| TC-PD-A1-2 | A1 | api | Away with `away_since` 16 min ago, run the job | one `still_away`; running again adds none | ✅ |
| TC-PD-A1-3 | A1 | api | Report `permission: denied` | status `location_off`, event `location_off` | ✅ |
| TC-PD-A1-4 | A1 | api | Admin alerts list, badge count, mark seen | unseen = n, then 0 | ✅ |
| TC-PD-A1-5 | A1 | api | Event created with an admin push token registered | push sender called with name/booth/distance only | ✅ |
| TC-PD-A2-1 | A2 | api | Admin polling page | tiles counts match statuses; booths-unattended count; row per volunteer incl. "not shared yet" | ✅ |
| TC-PD-A2-2 | A2 | api | Last report 11 min ago | row status `not_reporting` | ✅ |
| TC-PD-A2-3 | A2 | api | Super-admin `/v1/admin/customers/:id/polling` | same shape | ✅ |
| TC-PD-SEC-1 | security | api | Volunteer reads `/polling`; admin of other party reads it; volunteer reports for someone else's mid | 403; 403; 403 | ✅ |
| TC-PD-O1-1 | O1 | api | Presence with poll date 31 days ago, run cleanup | rows and events deleted | ✅ |
| TC-PD-U-1 | V2 | unit | `distanceM` (haversine) known pair | within 1 m of reference | ✅ |
| TC-PD-U-2 | V1 | unit | `inWindow` for date/opens/closes at 04:59, 05:00, 18:59, 19:00 IST and other day | false, true, true, false, false | ✅ |
| TC-PD-U-3 | V2/PD4 | unit | `judge` sequence: in, out, out, in; poor accuracy ignored; no booths | at, at, away, at; unchanged; missing | ✅ |
| TC-PD-U-4 | V4 | unit | Presence queue keeps only the latest reading, sends when online | 1 pending; cleared after ok | ✅ |
| TC-PD-UI-1 | V1 | ui | Polling-day window, location denied | only the location screen; volunteer tabs not reachable | ✅ |
| TC-PD-UI-2 | V1/V3 | ui | Allow location at booth, then move 650 m (two readings) | app opens; banner "You are 6xx m from Booth …" | ✅ |
| TC-PD-UI-3 | A2 | ui | Admin opens Polling day | tiles, map, table with the volunteer Away; badge | ✅ |
| TC-PD-UI-4 | S1/S2/S3 | ui | Super-admin: add election, edit booth location, set distance | saved; shown in lists | ✅ |
| TC-PD-UI-5 | a11y/i18n | ui | Axe on the new pages; Punjabi | no serious issues; all text translated | ✅ |
| TC-PD-N-1 | PD3/A1 | native | Android build: background, screen off, walk 400 m | notification on phone; admin gets push | ⬜ |

**Run 2026-11-20:** backend vitest 113/113 (`test/9-polling.test.ts` 24, incl. a report outside the window is not stored, admins can fix a booth location without the GPS feature); Jest 87/87 (`rules.test.ts` 4, `tracker.test.ts` 2); tsc + ESLint clean; puppeteer `pd-ui.js` with emulated GPS: location refused → only the location screen (also on /voters) and the admin sees Location off; allowed at 100 m → At booth 112; 650 m then 660 m a minute later → away banner on the phone, Away + "left" alert for the admin; back → "returned"; admin page tiles/map/table/alerts on desktop and phone, live strip on phone admin screens, sidebar badge cleared on opening; super-admin Polling days, Booth locations (AC 66), Customer → Polling day tab, customer page; Punjabi; axe: no serious issues. Regression: `web-desktop.js` 17/17 (super-admin menu now 9 items), `sync-ui.js` 9/9.
TC-PD-N-1 (Android build: background, screen off, push to the admin) is not run: needs a phone build (EAS / emulator).

Fixed while testing: the website dev server needed a restart to pick up the new packages; the shared popup (Sheet) dialog had no accessible name on the web and its backdrop had a label without a role; "Synced" chip text was 4.09:1 (now 5.7:1 with `successText`); buttons were given icon names as text (removed); the page was renamed **Booth attendance** because the existing voter-turnout page is already called "Polling day".

