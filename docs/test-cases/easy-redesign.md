# Test cases: Easy redesign (spec docs/specs/easy-redesign.md)

| TC-ID | REQ | Steps | Expected | Type |
|---|---|---|---|---|
| TC-ER-B1 | O4/B3 | Super-admin reads a team | New keys voice, reports, trend, addPhone, residence, tips are on; featureWho `{}` | api |
| TC-ER-B2 | O4/B3 | Set voice = admins only, then volunteers only | Volunteer's `/v1/me` voice off / on; admin's on / off | api |
| TC-ER-B3 | O4 | Switch voice off for the team | Off for admin and volunteer | api |
| TC-ER-B4 | O4 | Bad who value; admin tries to change it | 422; 403 | api |
| TC-ER-B5 | O5/B4 | Deny "mark"; volunteer sends group and needs-help changes | 403 not_allowed; `/v1/me` deny = [mark] | api |
| TC-ER-B6 | O5/B4 | Deny "addPhone"; send mobile; then group | Mobile 403; group 200 | api |
| TC-ER-B7 | O5/B4 | Deny "phones"; volunteer lists voters | Mobile shows 98xxxxx210; the admin still sees the full number | api |
| TC-ER-B8 | O5/B4 | Pause the volunteer; call a team route; unpause | 403 paused; `/v1/me` paused true; 200 after unpause | api |
| TC-ER-B9 | O5 | Unknown ability; admin changes access | 422; 403 | api |
| TC-ER-B10 | S2 | Team member list | Shows paused and deny | api |
| TC-ER-B11 | B1/B2 | Mark died + not found; recompute; booth-stats | Booth 113 died ≥ 1, notFound ≥ 1, all counters, days list; `?booth=113` only 113; volunteer 403 | api |
| TC-ER-B12 | B2 | Put booths 112, 113 in an area; booth-stats + dashboard by area | Only those booths; dashboard total = their sum | api |
| TC-ER-U1 | V3 | `matchVoter` with group / phone / age / gender / living / needs-help filters | Each filter keeps only matching voters; empty filter keeps all | unit |
| TC-ER-U2 | V3 | `sortVoters` serial / name / youngest / oldest / house | Order as named | unit |
| TC-ER-U3 | V3 | Search "PBX20", "Kaur", "12" | EPIC, name, house number matched | unit |
| TC-ER-U4 | V3 | `houseColour`: 2 ours + 1 opp; 1 our + 1 opp; nobody met | our; swing (tie); left | unit |
| TC-ER-U5 | V2 | `shortcutCounts` for a booth | Counts equal the voter list filtered by the same filters | unit |
| TC-ER-U6 | A1 | `sumStats` over booth rows; `leadOf` | Totals add up; lead our / swing / opp by 5 % of voters | unit |
| TC-ER-U7 | A4 | `matrixRows` with group hidden and search | Hidden group rows gone; search keeps matching rows | unit |
| TC-ER-U8 | O2 | `filterLabel` / pills | "Ours + With phone"; removing a pill drops only that key | unit |
| TC-ER-UI1 | V1 | Render VoterCard for an "our" voter | Card background is the our tint; EPIC, relative and house visible; badge "Ours" | ui |
| TC-ER-UI2 | V1 | Open card, tap Swing | onMark('target') called; Undo toast | ui |
| TC-ER-UI3 | V3 | Voters list: open Filter, pick "With phone", Show | Pill "With phone" shown; list shrinks; Clear all restores | ui |
| TC-ER-UI4 | O1 | Android 3-button nav | ☰ visible; tab labels above system buttons | manual |
| TC-ER-UI5 | O2 | Admin: Dashboard → Ours tile → Back | Dashboard unchanged (no booth/zone set) | manual |
| TC-ER-UI6 | V4 | Volunteer opens Poll day (poll on, location not given) | Location screen with Allow location; after allow, booth strip | manual |
| TC-ER-UI7 | A4 | Complete data: pick 3 booths, tap a cell | Table has Total + 3 columns; cell opens that list | manual |
| TC-ER-UI8 | S1 | Super-admin switches Poll day off | Poll day tab gone for that team after refresh | manual |
| TC-ER-NF1 | i18n | Switch to Hindi / Punjabi | Every new label translated; "Swing" word shown | manual |
| TC-ER-NF2 | a11y | 130 % font | Tiles and cards wrap, nothing cut | manual |
| TC-ER-NF3 | offline | Airplane mode on volunteer Home / Voters / filters | Works from the device copy | manual |

## Results (2026-11-25)
- api TC-ER-B1…B13: pass (backend-v2/test/99zz-easy.test.ts; server 233/233).
- unit TC-ER-U1…U8, ui TC-ER-UI1…UI3: pass (src/features/easy/*.test.ts*; app 156/156). tsc + eslint: no errors.
- manual on Android emulator (Pixel 8 Pro, Android 12, Expo Go, local API): TC-ER-UI4 ☰ visible + tab bar above system buttons ✓;
  TC-ER-UI5 Dashboard → Ours → booth → Back → Back: Dashboard unchanged ✓; TC-ER-UI6 Poll day asks for location first ✓;
  TC-ER-UI7 Complete data table (Total + 25 booths) ✓; volunteer Home, Voters/Houses lists, house page, marking turns the card green + Undo ✓;
  admin Reports hub, booth page, Poll day voting ✓.
- Not yet checked: TC-ER-UI8 (super-admin switch on a phone), TC-ER-NF1 Hindi/Punjabi screens, TC-ER-NF2 130 % font, TC-ER-NF3 offline, APK build.
