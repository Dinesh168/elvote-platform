# App v2 frontend (REQ O1–O5, V1–V5, A1) · status: confirmed (2026-11-18)

Functional requirements, decisions D1–D19 and the screen map live in [`app-v2.md`](app-v2.md). This spec covers **how the new frontend is built**: stack, structure, data layer, the build order and the non-functional requirements. The visual rules are in [`../DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md) ("Clear", the iOS-style look). The approved prototype is https://claude.ai/artifact/SKB3uArAMV7gMthwuCSipR.

## Goal

A production-quality Android, iOS and Web client, built from scratch in `src/`. It is built against a **mock API** first. The backend phase then swaps in the real API without changing any screen.

## Owner decisions for this phase (confirmed 2026-11-18)

| # | Decision |
|---|---|
| F1 | Data: **mock API** behind a typed interface until the backend phase. The new app never calls the production API in this phase |
| F2 | Order: foundation → volunteer screens → polling day → admin. Each part is shown to the owner when done |
| F3 | Branch `feature/app-v2-frontend` in this repo (cut from `platform-main`, the branch pushed to `platform`) |
| F4 | Languages: English + Punjabi (default regional). Another language = one new JSON file |
| F5 | Run targets: Web + Android emulator; iOS via EAS cloud builds later |
| F6 | Look: iOS-style "Clear" on all platforms (DESIGN_SYSTEM §3) |

## Requirements

### O1 Foundation
- **Behaviour:** TypeScript, Expo Router with routes in `src/app/`, design tokens in `src/design/tokens.ts`, fonts (Inter, Noto Sans Gurmukhi), the component kit in `src/design/components/`, i18n, and a component gallery route `/dev/gallery` (dev builds only).
- **Acceptance:** Given the app starts, when it opens on Web or Android, then the gallery renders every kit component with the same look on both.
- **Edge cases:** fonts not loaded yet (splash stays up); 130% font scale (no clipped text in kit components).

### O2 Data layer (mock API)
- **Behaviour:** `src/api/types.ts` defines the API contract (TypeScript types). `src/api/client.ts` exposes `api` with two implementations: `mockApi` (in-memory, seeded) and later `httpApi`. The choice is made by one env flag, `EXPO_PUBLIC_API_MODE=mock|http` (default `mock`). Screens use **TanStack Query** hooks in `src/features/*/queries.ts`; they never import an API implementation directly.
- **Seed:** 2 booths (112: 1,200 voters; 113: 1,054 voters) generated **deterministically** from a fixed seed: Punjabi names, relatives, houses (2–6 voters each), ages 18–95, gender, some with mobile, about 42% already met with groups. Plus 3 tasks and 1 volunteer (Suresh, booths 112 and 113).
- **Acceptance:** Given mock mode, when a screen loads booth data, then the counts match `selectBoothStats(booth)` computed from the seed; there is no network call.
- **Edge cases:** simulated latency (300 ms) and an error toggle (for tests of loading/error states).

### O3 Offline writes
- **Behaviour:** canvassing writes (group, lives here, needs help, mobile, voted) go through a **mutation queue** that is persisted on the device and replayed in order. The UI updates optimistically. The `SyncPill` shows *Synced · time*, *Saving…* or *Offline · N saved*.
- **Acceptance:** Given no network, when the volunteer marks 3 voters, then the voters show the new group and the pill says "Offline · 3 saved". When the network returns, the queue drains and the pill says "Synced".
- **Edge cases:** app killed while offline (queue survives restart); the same voter is changed twice offline (last write wins, in order); Undo while offline removes the queued write.

### O4 Quality
- **Behaviour:** ESLint (expo config) + Prettier, `tsc --noEmit`, Jest (`jest-expo`) + React Native Testing Library, a GitHub Actions workflow running lint, typecheck and tests on every PR.
- **Acceptance:** `npm run lint`, `npm run typecheck` and `npm test` all pass locally and in CI.

### O5 iOS-style look
- **Behaviour:** every screen uses only kit components and tokens (DESIGN_SYSTEM §3–4). No hex values in screens.
- **Acceptance:** a lint rule or test fails if a file under `src/app` or `src/features` contains a hex colour literal.

### V1 Onboarding: Language → Login → Join → Waiting
- Language: two big tiles (ਪੰਜਾਬੀ / English), saved on the device.
- Login: mobile number (10 digits, numeric pad) → 6-digit OTP. **Mock:** OTP `123456` succeeds, anything else shows "Wrong code. Try again." Resend after 30 s.
- Join: party code (mock valid code `RAMPUR24`) + name → request sent → **Waiting for approval** screen with Refresh; mock approves on the second Refresh.
- **Acceptance:** Given a new install, when the user picks Punjabi, enters a valid mobile and `123456`, enters `RAMPUR24` and a name, and taps Refresh twice, then they land on Home in Punjabi.
- **Edge cases:** wrong OTP 5 times → wait 60 s; invalid party code; app reopened while waiting (stays on Waiting).

### V2 Home
- As prototype 2.1 and REQ V-DASH-0…6: booth row + sheet, Next voter card with the task sheet (selection rule in V-DASH-0), Search field (opens Voters with the keyboard up), My work, Voter groups, More numbers (4 rows → detail lists), My tasks. Sync pill and ਪੰ / A language pill.
- **Acceptance:** every number equals the stats computed from the mock data for the selected booth; changing the booth updates every number; tapping any number opens Voters with the matching filter.

### V3 Voters
- As prototype 2.3: booth link + sheet, search (house no. exact, name / EPIC contains, age exact), House-wise | Serial no. segmented control, chips (All, Not met, Our, Target, Opposition, plus filters passed from Home), inline-expanding rows, GroupPicker (save → close → open the next not-met voter → Undo toast), Lives here and Needs help segmented answers, mobile field (10 digits), Same address, Send slip, Call.
- Lists use **FlashList**; 1,200 rows scroll at 60 fps on a mid-range Android.
- **Acceptance:** Given voter 44 is open, when the volunteer taps Our, then 44 shows "Our", the next not-met voter in the current order opens, and Undo restores the previous state.

### V4 Surnames, Voter slip, Tasks, Me, Help list
- As prototype boards. The slip shares as an image or PDF (`expo-print`/`expo-sharing`). Me has language, sync status and Sync now, booth list, logout (with confirmation).

### V5 Polling day
- As prototype 3.1: summary group (ring, not-voted counts per group, Needs help row), serial-number panel, number pad, ✓ Voted, last-marked chips with Undo, "Already voted at …" warning, booth sheet.
- **Acceptance:** typing `43` shows "Ramesh Kumar · Target"; ✓ Voted marks it, clears the panel, increments the voted count and decrements Target-not-voted, all within 100 ms (optimistic).

### A1 Admin (mobile)
- Dashboard, Map, Team approvals, Tasks, Polling day, Settings, as the admin boards, restyled to "Clear" when built (phase 3).

## Structure

```
src/
  app/                 Expo Router routes: (onboarding)/, (volunteer)/(tabs)/, (admin)/, dev/gallery
  design/              tokens.ts, fonts.ts, components/ (+ *.test.tsx)
  i18n/                index.ts, en.json, pa.json
  api/                 types.ts, client.ts, mock/ (seed.ts, db.ts, mockApi.ts), http/ (later)
  features/<name>/     queries.ts, hooks, selectors, feature components (+ tests)
  stores/              Zustand: session, preferences (language, booth, task), offline queue
  lib/                 utils (format, phone, time)
```

The old root code (`App.js`, `screens/`, `components/`, `storemanagement/`, `services/`, `theme.js`, `strings.js`) stays untouched until the new app covers the volunteer flow, then it is deleted in one PR.

## Data / API changes
None in this phase. `src/api/types.ts` documents the contract the backend phase must implement (it becomes the source for `docs/API.md` v1).

## Non-functional requirements (from `elvote-production`)

| Area | Requirement for this phase |
|---|---|
| Security | No secrets in the client; no production API calls; auth token kept in `expo-secure-store` (native) or memory (web) once real auth lands |
| Privacy | Mock data is synthetic; voter objects are never logged (`console` calls with voter data fail lint review) |
| Offline | O3; read queries persisted, so the last data shows offline |
| Performance | Cold start < 2.5 s on a mid-range Android (release build); list scroll 60 fps with 1,200 rows; tap feedback < 100 ms |
| Accessibility | Every touchable has a role + label (tested); AA contrast from the tokens; works at 130% font scale; Reduce Motion respected |
| i18n | Every string in `en.json` / `pa.json`; a test fails on missing keys in `pa.json` |
| Observability | Error boundary per route; Sentry wired in phase 5 |

## Known gaps (accepted for this phase)
- Real OTP, real join/approval and real data arrive with the backend phase.
- iOS is verified through EAS cloud builds later (no Mac).

## Out of scope
Backend, database, admin web layout, store release.
