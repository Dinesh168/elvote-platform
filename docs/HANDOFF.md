# Handoff: where the work stopped (read this first in a new session)

Last updated: 2026-11-23 (theelvote account session).

## Committed and deployed
- Branch `feature/usability-r2` (commit `dde384c`, pushed to `platform`): usability round 2
  (spec `docs/specs/usability-r2.md`) — phone upload fix, one role per account, team bar + quiet sync,
  confirm pop-ups, per-tab page stacks (swipe back), Done bar, polling Clear, join by QR, Team QR,
  assembly picker, admin Surnames, super-admin approvals / open team as admin.
- Demo (demo.champn.in), iPhone Expo Go update and Android APK
  (https://expo.dev/accounts/dinesh1255/projects/elvote-max/builds/0296669a-07d3-4ed5-aadc-7f196f1611c9) are on this version.

## In progress: visual redesign (designs only, NO code yet)
- Owner asked: app looks scary / hard; make it understandable without reading — colour + icon + big numbers,
  proper dashboards, side menu, profile, settings, bottom tabs; admin needs more insights and must be very easy.
- Designs (44 screens, arranged by flow, with flow notes): canvas https://claude.ai/artifact/YKGDVoXB3vPJ5cehihHfcX
  (owned by the dinesh.r@kosha.ai Claude account). Offline copy: `docs/design/visual-redesign/`
  (open any `*.dc.html`; `canvas.json` lists screens, positions and the flow notes).
- Rows: 1 first open · 2 join / admin request · 3 volunteer daily work · 4 volunteer menu & account ·
  5 polling day · 6 admin daily work (6.1 dashboard = goal card + "Needs you today") ·
  6b insights + assembly → zone → booth summaries · 7 admin menu & tools · 8 admin website.
- Colour key (same everywhere): green = ours/done, amber = target, red = opposition/alert, grey = not met,
  blue = actions/menu, purple = tasks. Super-admin pages are out of scope for this redesign.

## Owner decisions (confirmed 2026-11-23)
- Navigation: bottom tabs + side menu from the photo. Meeting buttons: icon + word.
- Keep: Profile weekly chart, quiet volunteers, admin goal + insights. Drop: Help video.
- Added (approved): today's target ring (default 25/day), streak + badges + team rank, picture tips (3.8),
  polling-day call list (5.4), remind quiet volunteers (6.8), yesterday summary (Insights), map colours by % met.
- NEW: Map & Trend from past elections (replaces the separate D:\Personal\projects\election-trend app):
  T1 `booth_results` per state DB (ac, booth, year, party, votes, total) loaded ONLY by super-admin upload
  (same CSV format as election-trend); T2 Trend page (admin selects state → own assembly → party (default own) →
  level assembly/zone/booth/village; vote share by year, swing); T3 Results map (who won / our share; lost by <50);
  T4 Booth detail + dashboard show last election. Demo gets made-up sample results. Same map component as admin Map.
- Updates are delivered over the air (EAS Update) after each change; new APK only for new native modules.
- Trend works at every level by tap-through + breadcrumbs: 9.1 assembly → 9.3 zone → 9.4 booth ("to win this booth now").
  9.5 Win plan: votes needed, booths Safe (won by 100+) / Swing (within 100) / Tough (lost by 100+), uncovered swing booths.
  Volunteer Home shows their booth's last result ("lost here by 40") — no analysis screens for volunteers.
  Voter slip is optional (small WhatsApp button on Meet), never forced after Save.
- Updated canvas (theelvote account, 52 screens, row 9 = Map & Trend): https://claude.ai/artifact/3jixJcLCVeAUxv8x3Xza6J

## Built 2026-11-23 (not committed yet)
- Spec `docs/specs/map-trend.md`, tests `docs/test-cases/map-trend.md`, server `backend-v2/src/routes/results.ts` + `src/lib/pastResults.ts`,
  migrations state/005 + core/008, test `test/95-past-results.test.ts` (server 185/185, app 133/133).
- App: `/admin/trend`, `/admin/results-map`, `/admin/win-plan`, `/platform/past-results`, Home ProgressCard, Me badges.
- Deployed to the demo (API + sample results + website) and EAS update `ea19dcc2-118f-4542-be10-4c241caee05d` (channel demo).
  Demo DB backups before the migration: /root/backups/demo_elvote_*-20261123-0451.dump.

- Second step (same day): side menu (`src/features/shell/SideMenu.tsx`, ☰ in TeamBar), picture tips (`src/features/home/Tips.tsx`),
  call list (`src/app/(tabs)/(poll)/call-list.tsx`), remind (`src/app/admin/(dashboard)/remind.tsx`), Yesterday card + quiet volunteers
  (dashboard API), icon + word group buttons. EAS update `9e850f73-8b04-4a8c-80e1-d6ed6946ade2`. Server 186/186, app 136/136.

- Third step: real demo data (spec `docs/specs/real-demo-data.md`): parties AAP/INC/SAD/BJP/SP/BSP; teams **AAP – PB AC 50 Rupnagar**
  and **BJP – UP AC 361 Ballia Nagar** (no admins yet: super-admin assigns); real booths, locations, 2022 results; voters with made-up
  names; booth strength worked out per party (admin can override + Reset). State UP added. Backups /root/backups/demo_elvote_*-20261123-0608.dump.
  EAS update `f049c217-42bb-41df-8834-8fe7197ccea8`. The ECI captcha scraper (ElvoteDataScraping) must not be used.

## Built and deployed to demo 2026-11-23 (not committed yet)
- spec states-keyboard: state dropdown (`Select`, remembers last state), `STATES` setting (demo PB,UP; Haryana row removed from demo core, backup /root/backups/demo_elvote_core-20261123-0731.dump), keyboard no longer hides boxes (Screen/Sheet). EAS update f3438cef. Owner to check TC-SK-6..8 on a phone.

- spec admin-request-form: Register as admin = Party dropdown (search, not listed → type) → State → Assembly → Position dropdown (10 + Other; sent in English). EAS 0a6c8d2a.

- spec party-states: parties by state (core.party_states; demo SAD→PB, SP→UP, others national); Register as admin = State → Party → Assembly → Position; super-admin sets a party's states on Parties. Backup demo_elvote_core-20261123-1037. EAS a36821c4.

- spec flow-fixes (2026-11-23): walk-through fixes (Home next voter first, Poll day keypad pinned, 6-digit auto sign-in, Team Review/Approve, team bar on all admin tabs), bottom menu safe-area, gifted charts, polling-day find across the assembly (EPIC / booth+S.No, mark Voted in window), old v1 client + backend/ removed. EAS 5f9e4fc6. Demo data reloaded 2026-11-23 (backup *-1122.dump); transliteration dropped (owner later).
- NEXT: super-admin full control (add admin/volunteer directly, create state, edit/remove roles) — confirmed by owner, not built yet.

- spec booth-map (2026-11-23): Leaflet map (WebView/iframe), clusters, colour by, booth card, set missing locations; Results map merged. Tiles: keyless Esri for the demo — needs a keyed provider (MapTiler) before production.
- spec admin-views (2026-11-24): zone button (no chip row), All booths page with bars, view by zone/area/village (super-admin), one-card voter marking (Died / Not found), poll-day one search box, super-admin add/remove admin & volunteer, booth area/village edit. Backup *-20261124-0402. EAS f62f3d05. Screens not yet seen in a browser (extension disconnected).

## Next
1. Owner checks the demo on the phone; fix what they report. Then "commit and push" when asked.
2. Screen checks still open: TC-MT-21, 22, 23, 25, 26, 27 (real phone, Hindi/Punjabi, 130 % font, speed on demo).

## Then (mandatory workflow, CLAUDE.md + .claude/skills/elvote-change)
Spec `docs/specs/visual-redesign.md` → test cases → code (screen by screen, keep existing data/API;
new backend only for insights: pace, conversions this week, quiet volunteers, best time, goal) →
tsc / eslint / jest / vitest → deploy demo → `eas update` + new APK only if native modules change.

## Rules that bite
- Local services may be stopped for memory; ask before restarting. No Android emulator (owner's rule).
- Commit only when asked. Never set passwords or create logins for the owner.
- Demo deploy: `pg_dump` first, restart only pm2 `elvote-v2-demo`; never touch the live `elvote` DB/app.

## Easy redesign (2026-11-24, designs only, NO code yet)
- Canvas (theelvote account): https://claude.ai/artifact/ByQFriznn47eEFH1QQt1U9 — clickable volunteer app, admin app, super-admin panel + snapshots.
- Owner decisions: cards fully tinted in group colour (light tint); "Our house" = most people met are ours; word **Swing** replaces Target;
  no "Next house" (volunteers go where they can: "Go to a house" + type house number); voice help kept.
- Every feature (Poll day, voice, reports, map, trend, export, tasks…) is switched on/off **per team by the super-admin**, with "who gets it"
  (everyone / admins / volunteers); super-admin can pause any person or switch off single abilities (mark voters, see phones, poll day, download).
- Admin: Group by Zone | Area switch (areas come from super-admin data); every list has search + filter + sort; Map and Trend are separate pages;
  Reports tab (complete data table for picked booths, every cell tappable; compare; daily; volunteer work; people; not living here) with charts.
- Navigation rule: Back returns to the page exactly as left. Opening a booth/zone/area pushes its own page (shortcuts + charts + all data);
  the Dashboard dropdowns never change by themselves.
- Voter card must show EPIC, father/husband name, house, needs-help, voted (old app had these). Family head removed. Caste/religion left out (DPDP).
- Poll day: volunteer is asked for location as soon as they open Poll day; booth locations come with the data (volunteers cannot set them);
  admin Poll day page = voting numbers (like today's app) + booth attendance (spec polling-day.md, already built).
- Open bugs reported by owner (Android): ☰ menu icon not visible in TeamBar; bottom tab bar sits behind the system navigation area.
- BUILT 2026-11-25 on branch feature/easy-redesign (not committed): spec docs/specs/easy-redesign.md (built), tests docs/test-cases/easy-redesign.md.
  Server 233/233, app 156/156. Checked on the Android emulator against a local API (see test-case results).
- Waiting on owner: (1) `npx eas-cli login` (Expo account not signed in on this PC) so the APK can be built;
  (2) approval to deploy backend-v2 + migrations core/012 and state/008 to the demo server (app falls back to the booth table until then);
  (3) "commit and push".
- Local tooling: Node 22.20 portable in the session scratchpad (machine Node 20.8 is too old for vitest/embedded-postgres); backend-v2/.env created locally (gitignored).
