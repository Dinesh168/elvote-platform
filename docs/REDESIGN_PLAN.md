# Redesign plan: ElVote v2 (Android · iOS · Web)

Goal: a premium, extremely easy app built from scratch on the [Sahaj design system](DESIGN_SYSTEM.md), shipped to the Play Store, App Store and the web from one Expo codebase. The old UI is not preserved. The backend API is reused and fixed in place.

## 1. Technical foundation (decided)

| Area | Choice | Why |
|---|---|---|
| App framework | **Expo SDK 54** (keep) | One codebase → Android, iOS, Web; EAS builds and OTA updates |
| Navigation | **Expo Router** (file-based, already installed) | Real URLs on web, deep links, stable route ids. Fixes the old "route name = translated string" bug |
| Server state | **TanStack Query** + persisted cache | Caching, retries, offline reads, far less code than sagas |
| Offline writes | Mutation queue (TanStack Query `persistQueryClient` + paused mutations) | Canvassing works with no network |
| Local / UI state | **Zustand** | Tiny and simple. Replaces `@betacrew/jars-flux` + redux-saga |
| Styling | Own token-based components (`src/design/`), `StyleSheet` + Reanimated | Premium custom look. Drops the generic react-native-paper style |
| i18n | `i18next` + `react-i18next` + `expo-localization` | Standard plurals and interpolation; per-language JSON files |
| Forms | `react-hook-form` + `zod` | Validation shared with the API types |
| Lists | `@shopify/flash-list` | 1,000-plus voters per booth stay smooth on cheap phones |
| Fonts | `@expo-google-fonts/noto-sans` + `noto-sans-devanagari` | Hindi and Marathi render correctly |
| Language | **TypeScript** for all new code | Safer refactors for many future changes |
| Quality | ESLint + Prettier, Jest + RNTL, GitHub Actions CI | Industry standard |

New code lives in `src/` (`src/app/` routes, `src/design/`, `src/features/<feature>/`, `src/api/`, `src/i18n/`). Old code at the root is deleted feature by feature as each one is rebuilt.

> **Requirements and decisions are now fixed in [`docs/specs/app-v2.md`](specs/app-v2.md)** (REQ-IDs + decisions D1–D19). Where this plan and the spec differ, the spec wins.

## 2. Information architecture

### Volunteer (mobile-first): 4 bottom tabs

| Tab | Purpose | Key screens |
|---|---|---|
| 🏠 **Home** | "What should I do now?" | Today's progress ring, big tiles: *Next houses*, *Find voter*, *Supporters to call*, *Polling day* (only near election) |
| 👥 **Voters** | Work the list | House-wise list (default), search, simple filter chips (Not met · Supporters · Not sure · Opposition · No phone · Age · Gender), voter detail |
| 🗳️ **Voting day** | Mark who voted, chase supporters | Voted / not voted, "supporters not yet voted" call list |
| 👤 **Me** | Profile, language, help, logout | Sync status, help videos |

**Voter detail = one screen, everything a tap away:** Mark met ✓ · Opinion (3 big buttons) · Phone (number pad) · Moved away · Call · WhatsApp · Print/share slip · Family (same house).

### Admin: web sidebar / mobile tabs
**Overview** (KPIs: total, met %, supporters, booth heat-map) · **Booths** (sortable table, strength, coverage) · **Voters** (search and filters) · **Team** (approve volunteers with one tap, assign booth, leaderboard) · **Reports** (exports) · **Setup** (super-admin, web only: constituencies, parties, upload roll).

## 3. Proposed product changes (need your OK, because they change the backend)

| # | Change | Benefit for low-literacy users | Backend impact |
|---|---|---|---|
| P1 | **Phone OTP login** (Firebase Phone Auth) instead of email + password | No email or password to remember | `users.email` becomes nullable; match users by phone. Migration needed |
| P2 | **Join by QR code / invite link** that carries the party pass key | No typing of a secret code | New `POST users/join` endpoint, signed invite tokens |
| P3 | **Offline canvassing queue** | Works in villages with no network | Endpoints must be idempotent (they already upsert per voter) |
| P4 | **Voice search** for voter names (speech-to-text) | Can't type? Speak the name | None (on-device) |
| P5 | **Help videos** (15 s each) in the local language | Learn by watching | Static content |

## 4. Phases

| Phase | Deliverable | Exit criteria |
|---|---|---|
| **0. Security hotfixes** | Backend B1–B3 fixed (SQL injection, cross-tenant, constituency check) + drift migration (B14) | Tested on a local DB copy; deployed in an agreed window with a backup |
| **0b. Scalable backend foundation** | `/api/v1` with input validation; per-tenant dynamic tables replaced by single tables (partitioned `voters`) via a migration + backfill; dashboard aggregate queries + per-booth counters + Redis cache; object storage for files; BullMQ jobs for roll import and exports; staging environment; k6 load tests | Meets the capacity target in the `elvote-production` skill on staging; production data migrated with zero loss (row counts verified) |
| **1. Foundation** | `src/` scaffold, Expo Router, tokens, fonts, component kit + a live **component gallery** screen, i18n, API client (TanStack Query), auth gate, CI | Gallery renders identically on Android, iOS and Web; lint and tests green |
| **2. Volunteer app** | Language → Login → Home → Voters → Voter detail → canvassing actions (offline) → Voting day → Me | Usability test with 3–5 real volunteers: main task done in < 10 s without help |
| **3. Admin app** | Overview, Booths, Voters, Team/approvals, Reports. Responsive web layout | Admin can run a booth review on a laptop |
| **4. Super-admin & setup** | Constituency, party, roll upload (with column preview and validation) | Upload of a full AC roll works end to end |
| **5. Release** | App icons, splash, store listings, privacy policy, EAS production builds, web deploy, crash reporting (Sentry) | Play internal test → closed → production; TestFlight → App Store; web on a custom domain |

Each phase is a separate PR, reviewed and run on all three platforms before merge.

## 5. Change-request workflow

Every new request ("change X", "add Y") follows the `elvote-change` skill (`.claude/skills/elvote-change/SKILL.md`). Every UI change follows the `elvote-ui` skill. These keep a long series of changes consistent.
