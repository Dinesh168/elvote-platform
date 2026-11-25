# Test cases: admin and volunteer fixes, round 1 (spec docs/specs/admin-fixes-r1.md)

| TC-ID | REQ | Steps | Expected | Type |
|---|---|---|---|---|
| TC-AF-B1 | A9 | booth-stats + dashboard `?zone=<id>` after splitting zones | 200; only the zone's booths | api |
| TC-AF-B2 | B1/A1 | Admin `search?epic=<known>` | exactly that voter | api |
| TC-AF-B3 | B1/A1 | Admin `search?name=<3+ letters>&address=<house>` | every row matches name and house | api |
| TC-AF-B4 | B1 | `search?name=<x>&age=40` | every row age 38–42 | api |
| TC-AF-B5 | B1 | `search?name=ab` | 422 (min 3 letters) | api |
| TC-AF-B6 | B1 security | Volunteer `search?name=…` | only own booths | api |
| TC-AF-B7 | B1 security | `search?name=x' OR 1=1 --` | 200, no rows (bound SQL) | api |
| TC-AF-U1 | A6/A7/A8 | Metric groups | voters group has helpNeeded + moved; age and gender groups; no 'people' group; dashboard groups exclude poll | unit |
| TC-AF-U2 | A10 | `defaultMatrixBooths(rows)` with 200 booths | 10 booths; cap 25 | unit |
| TC-AF-U3 | O1 | Sheet with 40 rows | rows inside a scroll view | ui |
| TC-AF-U4 | A4/A5 | Admin side menu | no Quiet volunteers / Map rows; has Search voter, Zones · areas · booths, Zone setup, Sign out | ui |
| TC-AF-U5 | V1 | Open voter card with house shared by 3 | "Same address voters (3)" button; press calls onSameAddress(house) | ui |
| TC-AF-U6 | O2 | `loadErrorText` for network vs 500 | "No internet" vs "server answered 500" | unit |
| TC-AF-U7 | V3 | en/hi/pa `easy.section` | Locality / मोहल्ला / ਮੁਹੱਲਾ | unit |
| TC-AF-U8 | A9 | scope fallback on 404 | zone ids from /zones, filter by id | unit |
| TC-AF-W1 | A2/A4 | Web: menu → Win plan, Zone setup, Trend, Settings | each page opens (URL changes) | e2e (playwright script) |
| TC-AF-W2 | A9 | Web: Dashboard → Zone ▾ → Z2 | numbers of Z2, no error | e2e |
| TC-AF-W3 | O1 | Web: Zone sheet, scroll to last zone, tap | last zone picked | e2e |
| TC-AF-W4 | A10 | Web: Reports → Complete data | opens with 10 booths | e2e |
| TC-AF-W5 | A1 | Web: Search voter by EPIC and by name + house | results; tap opens the voter | e2e |
| TC-AF-W6 | A5 | Web: menu name → My profile → Sign out → confirm | sign-in screen | e2e |
| TC-AF-W7 | V2/V1 | Web volunteer: Home top shows banner; voter card Same address | banner first; button opens house | e2e |
| TC-AF-W8 | A3 | Web: Zones · areas · booths, switch Zones/Booths | rows; tap opens place | e2e |
| TC-AF-NF1 | i18n | Hindi / Punjabi on the changed screens | every new label translated | manual |
| TC-AF-NF2 | a11y | 130 % font on menu, search, profile | nothing cut | manual |

## Results (2026-11-25, local API + seed data, web at 412×900 in Chromium)
- api TC-AF-B1…B7: pass (backend-v2/test/99zzz-admin-fixes.test.ts). Full server suite 240/240.
- unit/ui TC-AF-U1…U8: pass (src/features/easy/fixes.test.tsx, src/features/shell/sideMenu.test.tsx). Full app suite 165/165. tsc clean, eslint 0 errors (no new warnings).
- e2e TC-AF-W1 (Win plan, Zone setup, Map & Trend, Settings, Search voter, Zones · areas · booths open) ✓; W2 zone Z2 numbers, no error ✓;
  W3 booth sheet scrolls with the mouse wheel to Booth 125 and it can be tapped ✓; W4 Complete data opens with 10 booths ✓;
  W5 name "Kaur" + house 12 → 8 found, tap opens the voter in booth 102 with Same address voters; EPIC search → 1 found ✓;
  W6 My profile → Sign out → confirm → sign-in screen ✓; W7 volunteer Home banner first, "Locality", Age wise / Gender wise / Migrants,
  Same address voters → house page ✓; W8 Zones list, tap Z2 → zone page ✓.
- Not yet checked: Android / iOS phone (no emulator run this round), TC-AF-NF1 Hindi/Punjabi screens, TC-AF-NF2 130 % font,
  Area mode (local seed has no areas), Complete data speed on the demo's real booth count.
