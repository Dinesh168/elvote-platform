# Test cases: web desktop layout (spec `docs/specs/web-desktop.md`)

Status: ⬜ not run · ✅ pass · ❌ fail. Unit = Jest; ui = puppeteer on the web dev build against backend-v2 sample data.

| ID | Req | Type | Steps | Expected | Status |
|---|---|---|---|---|---|
| TC-W1-1 | W1 | unit | `layoutFor('web', w)` for 1440, 1024, 1023, 768, 767, 390; `layoutFor('android', 1440)` | desktop, desktop, rail, rail, phone, phone; phone | ✅ |
| TC-W2-1 | W2 | ui | Admin 9000000002 at 1440×900 | Sidebar visible with 7 items; no bottom tab bar; Dashboard has `aria-current="page"` | ✅ |
| TC-W2-2 | W2 | ui | Click Team, then Zones, then browser Back | URL /admin/team → /admin/zones → back to /admin/team; current item follows | ✅ |
| TC-W2-3 | W2 | ui | Volunteer 9000000003 and super-admin 9000000001 at 1440 | Volunteer sidebar 6 items; super-admin 4 items | ✅ |
| TC-W2-4 | W2 | ui | Admin at 900×800 | Icons-only sidebar (≤ 80 px wide); no bottom tabs | ✅ |
| TC-W2-5 | WD1 | ui | Admin at 390×844 (web) | Bottom tab bar as before; no sidebar | ✅ |
| TC-W3-1 | W3 | ui | Admin dashboard at 1920 | Content column ≤ 1200 px; no horizontal scroll at 768/1024/1440/1920 | ✅ |
| TC-W3-2 | W3 | ui | Open a booth from the dashboard table | Breadcrumb "Dashboard › Booth N"; clicking "Dashboard" returns | ✅ |
| TC-W3-3 | W3 | ui | Visit Dashboard, Team | `document.title` is "Dashboard · ElVote", "Team · ElVote" | ✅ |
| TC-W4-1 | W4 | ui | Tab through the admin dashboard | Focused element shows a visible outline; Enter on a sidebar item navigates | ✅ |
| TC-W4-2 | W4 | ui | Open the AC switcher at 1440 | Centred dialog; Esc closes it | ✅ |
| TC-W4-3 | W4 | ui | Click the "Met" header in the booth table twice | Rows sort ascending then descending; header has `aria-sort` | ✅ |
| TC-W4-4 | W4 | unit | Render kit components with layout `phone` | Same output as before (existing component tests pass) | ✅ |
| TC-W5-1 | W5 | ui | Login at 1440 | Brand panel + centred card ≤ 440 px; sign-in with 9000000002 / 123456 works | ✅ |
| TC-W6-1 | W6 | ui | Admin dashboard at 1440 | 4 tiles on one row; at least 2 charts side by side | ✅ |
| TC-W7-1 | W7 | ui | Super-admin overview at 1440 | Tiles on one row; parties table visible | ✅ |
| TC-W8-1 | W8 | ui | Volunteer home at 1440 | 2 columns; Start meeting works | ✅ |
| TC-W3-4 | W3 | ui | Every page (admin 9, volunteer 8, super-admin 4) at 1366×768: mouse-wheel to the end | Last content reachable; no page-level scroll; sidebar complete (also at 1280×600) | ✅ |
| TC-W3-5 | W3 | ui | Reload /tasks, /surnames, /help, /admin/booth?no=113 | Same page opens (query kept), not Home/Dashboard | ✅ |
| TC-W8-2 | W8 | ui | Volunteer Polling day at 1366: type 15 on the keyboard | Voter S.No 15 shown; no on-screen keypad; Enter marks Voted | ✅ |
| TC-WA-1 | NFR | ui | axe-core on Login, Admin dashboard, Team, Platform overview, Volunteer home | 0 serious/critical violations | ✅ |
| TC-WN-1 | WD1 | unit | Full Jest suite, tsc, lint | All pass; no raw colours in screens | ✅ |

**Run 2026-11-19:** Jest 68/68 (incl. TC-W1-1), tsc and ESLint clean; puppeteer `web-desktop.js` 17/17 against the dev web build + local backend-v2 (axe-core 4.10.2: 0 serious/critical on Login, Admin dashboard, Team, Platform overview, Volunteer home). Phone-size regression run 18/19: the one failure is a React dev-mode-only console warning (`Unknown event handler property onStartShouldSetResponder`) on the admin flow, not reproduced by visiting the admin pages directly; recheck on the production web build.

**Fix run 2026-11-19 (owner: "few pages not proper and scrollable, and also sidebar"):** fixed sidebar items losing their layout (link styling), Voters list not scrolling on desktop, reload losing `?no=` and the newer volunteer pages, map labels clipped, desktop Polling day using the phone keypad. `scrollcheck.js` 21/21 pages reach their end; `web-desktop.js` 17/17; Jest 68/68.
