# Test cases: Map & Trend, Win plan, extras (spec docs/specs/map-trend.md)

| TC | REQ | Steps | Expected | Type |
|---|---|---|---|---|
| TC-MT-1 ✅ | T2 | Super-admin uploads a 3-booth × 2-year CSV for PB AC 66 | 200; rows 6, years [2017, 2022], parties [AAP, INC, SAD] | api |
| TC-MT-2 ✅ | T2 | Upload again with changed votes for 2022 | 2022 rows replaced, 2017 kept | api |
| TC-MT-3 ✅ | T2 | Upload missing `Year` column / non-numeric votes | 422 with the line; nothing written | api |
| TC-MT-4 ✅ | T2 | Admin and volunteer call upload, list, delete | 403 | api |
| TC-MT-5 ✅ | T2 | Super-admin deletes AC 66 2017 | list no longer shows it | api |
| TC-MT-6 ✅ | T3 | Admin opens trend (assembly) with no `party` | party = team party code; years sorted; shares sum ≈ 100; swing = last − previous | api |
| TC-MT-7 ✅ | T3 | Admin passes `party=INC` | ours/winner recomputed for INC | api |
| TC-MT-8 ✅ | T3 | Level zone with a zone key | children = booths of that zone only | api |
| TC-MT-9 ✅ | T3 | Assembly with no results | 200, `years: []`, empty children | api |
| TC-MT-10 ✅ | T3 | Volunteer calls trend / results-map / win-plan | 403 | api |
| TC-MT-11 ✅ | T3 | Admin of AC 66 tries `?ac=67` | ignored; AC 66 data only | api |
| TC-MT-12 ✅ | T4 | Results map for the last year | one row per booth with winner, ours, margin; legend counts add up | api |
| TC-MT-13 ✅ (in TC-MT-8) | T5 | Booth trend | votes by year + toWin/oursFound/toGo | api |
| TC-MT-14 ✅ | T6 | Volunteer of booth 101 calls my-booth-result | won/lost + margin for 101 only; no party votes | api |
| TC-MT-15 ✅ | W1 | Win plan | groups safe/swing/tough by D6; needed > 0; uncoveredSwing lists swing booths without a volunteer | api |
| TC-MT-16 ✅ | G1 | Volunteer marks 3 voters today, 1 yesterday | today 3, streak 2, rank ≥ 1 | api |
| TC-MT-17 ✅ | G2 | Badges | 100-met locked when met < 100 | api |
| TC-MT-18 ✅ | Q1 | Admin reminds 2 quiet volunteers | 200 sent 2; again within 12 h → 429 | api |
| TC-MT-19 ✅ | Q1 | Admin reminds a user of another team | 403 / skipped (not sent) | api |
| TC-MT-20 ✅ | Y1 | Insights | `yesterday` has met, ours, changes, bestBooth | api |
| TC-MT-21 | T3 | Trend screen: chips state/assembly/party, level tabs, tap zone → zone trend, tap booth → booth trend, breadcrumbs back | ui |
| TC-MT-22 | T4 | Results map: Who won / Our share switch, tap booth card | ui |
| TC-MT-23 | G1 | Home ring + streak + rank chips render; Hindi and Punjabi; 130 % font | ui |
| TC-MT-24 ✅ | G3 | Tips show once; Skip hides forever | ui |
| TC-MT-25 | P1 | Call list offline shows ours-not-voted with call buttons; countdown | ui |
| TC-MT-26 | NFR | Trend/map/win-plan for 300 booths × 4 years < 300 ms on demo | manual |
| TC-MT-28 | side | Volunteer opens ☰: only volunteer pages; admin: Win plan, Map & Trend; disabled features hidden | menu matches the role ✅ | ui |
| TC-MT-27 | NFR | Charts have text labels (axe, screen reader) | ui |

Automated: backend-v2/test/95-past-results.test.ts (19 tests; full server suite 186/186). App: src/features/shell/sideMenu.test.tsx (3) + all others, 136/136; tsc and eslint clean. Not yet checked on a real phone: TC-MT-21, 22, 23, 25, 26, 27.
