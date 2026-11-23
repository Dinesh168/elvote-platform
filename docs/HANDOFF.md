# Handoff: where the work stopped (read this first in a new session)

Last updated: 2026-11-23.

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

## Waiting for the owner (do not start code until "confirm")
1. Navigation: bottom tabs + side menu from the photo (proposed), or side menu only?
2. Meeting buttons: icon + word (proposed), or icons only?
3. Keep the extras: Profile weekly chart, Help video, "quiet volunteers", admin goal % (default 80%)?
4. Any screen changes.

## Then (mandatory workflow, CLAUDE.md + .claude/skills/elvote-change)
Spec `docs/specs/visual-redesign.md` → test cases → code (screen by screen, keep existing data/API;
new backend only for insights: pace, conversions this week, quiet volunteers, best time, goal) →
tsc / eslint / jest / vitest → deploy demo → `eas update` + new APK only if native modules change.

## Rules that bite
- Local services may be stopped for memory; ask before restarting. No Android emulator (owner's rule).
- Commit only when asked. Never set passwords or create logins for the owner.
- Demo deploy: `pg_dump` first, restart only pm2 `elvote-v2-demo`; never touch the live `elvote` DB/app.
