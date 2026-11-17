# Production readiness: audit and roadmap

Audit date: 2026-11-17. Scope: client (repo root), backend source (`backend/`, byte-identical to the code deployed at `/var/www/elvote/mobileappbe`), and a **read-only** inspection of the production PostgreSQL schema and aggregate counts.

Severity: **P0** = fix before any production use · **P1** = fix before launch · **P2** = fix soon after launch · **P3** = tech debt.

## Backend (`backend/`)

| # | Sev | Finding | Evidence | Fix |
|---|---|---|---|---|
| B1 | **P0** | **SQL injection.** Request values are interpolated into `knex.raw()` strings: `filters.voter_opinions` (`'${opinion}'`), `filters.volunteer_ids` (`.join(',')`), `page_num` (`LIMIT ${…}`), and the `x-constituency` header (embedded in table names inside raw SQL). Any logged-in volunteer can run arbitrary SQL, including reading every party's data or dropping tables | `backend/src/models/VotersModel.js` lines ~109–136, 341, 409, 473, 581–618, 726–736 | Use bindings: `knex.raw('… opinion = ANY(?)', [arr])`. Validate `x-constituency` and `page_num` as integers in middleware (`/^\d+$/`). Build table names only from validated ints, through one helper that asserts the format |
| B2 | **P0** | **Cross-tenant approval.** `update_user_approve_status` checks only `role !== volunteer`. Any admin can approve or reject **any** user by `uniqueId`, in any party, and assign any `pollingStationId` | `controllers/users.js:190` | Load the target user and require `target.account_id === caller.account_id`. Validate that the polling station belongs to one of the account's constituencies |
| B3 | **P0** | **`x-constituency` not authorized.** The header is trusted as is. A user of party A can set another constituency number and read that constituency's shared `voters_<C>` roll | `middleware/RouteMap.js:98` | In middleware, require the constituency to be in `constituency_account_mapping` for `user.account_id`, otherwise 403 |
| B4 | P1 | Voter mutations (`set_voter_*`) don't check that the voter belongs to the volunteer's polling station | `controllers/voters.js:673–775` | Verify `voter.part_no` ∈ the volunteer's booth (admins: the account's constituency) |
| B5 | P1 | `POST users/mine` is an upsert that bypasses the approval gate. An existing user can switch accounts with another pass key, or an admin can demote themselves. `permissions_list` is hard-coded `{"1":"1"}` | `controllers/users.js:156` | Allow create only (reject if the row exists), or restrict which fields can change |
| B6 | P1 | `clear_voters_data` TRUNCATEs the **shared** `voters_<C>`, which wipes the roll for every party in that constituency, and isn't transactional with the XLSX export | `VotersModel.truncateVotersAndDataCollection` | Delete only the account's data, or make the roll per account. Wrap it in a transaction and keep a DB-level backup first |
| B7 | P1 | Firebase **Admin** service-account key and `.env` (DB password, JWT secret) were distributed inside `mobileappbe.zip`. The DB password is weak | zip contents | Rotate the Firebase Admin key and DB password. Keep the secrets only on the server (or in DO App Platform secrets). They are now gitignored in `backend/` |
| B8 | P1 | Super-admin is a hard-coded UID in **both** client and server | `controllers/private.js validatePrivateUser` | Firebase custom claim `superadmin: true`, checked in middleware |
| B9 | P2 | Dynamic per-tenant tables (`voters_<C>`, `data_collection_<C>_<A>`…) are created outside migrations, so schema changes need hand-written loops and there are no FKs to `users` or voters | `ConstituencyModel`, `AccountsModel` | Long term: one `voters` table partitioned by `constituency_number`, and one `data_collection` table with `(account_id, constituency_number)` plus FKs and row-level scoping |
| B10 | P2 | Verbose `console.log` of UID and email on every request; CORS reflects any origin with credentials; 100 MB body limit; Express 4.16 (old) | `RouteMap.js`, `app.js` | Structured logger without PII, an origin allow-list, ~10 MB limits on non-upload routes, upgrade Express, add `helmet` and rate limiting |
| B11 | P2 | Party data (`ballotNo`, leader, image) is read from JSON files named `account_<A>_<C>.json`; the only file in the repo is `account_7.json`, which never matches | `controllers/constituency.js:42` | Move it into the `accounts.other_data` jsonb column |
| B12 | P2 | Caste stored as free text (`General`/`OBC`/`SC/ST`), but client presets filter by `G/B/C/T`. **Live data: caste and religion are empty for all 448k voters**, so those features show nothing | DATA_MODEL § 6, § 9 | Agree on codes, normalize on import, and re-import or backfill caste and religion |
| B14 | **P1** | **Schema drift in dynamic tables (verified live).** Accounts 1, 4, 5, 6 lack `data_collection.is_voter_migrated` and `live_voting_*`, so migration and polling-day endpoints return 500 for them. `voters_58` is orphaned | DATA_MODEL § 9 | One-time idempotent migration (`ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS`); test it on a `pg_dump` copy first |
| B13 | P3 | No tests, no lint, no Dockerfile or process manager config in the repo | | Jest + supertest; a `Dockerfile`; a `pm2` ecosystem file or systemd unit |

## Security and privacy

| # | Sev | Finding | Evidence | Fix |
|---|---|---|---|---|
| S1 | **P0** | **GCP service-account private key committed** (Play Console account, project `krishnakutumb-beaf6`). It is in git history, so deleting the file is not enough | `krishnakutumb-beaf6-b77519735662.json` | 1) Revoke the key in GCP IAM now. 2) `git rm --cached`, then add `*serviceaccount*.json` and `krishnakutumb-*.json` to `.gitignore`. 3) Purge history (`git filter-repo`) if the repo is or was ever shared. 4) Store the new key in EAS credentials |
| S2 | P2 | Super-admin is a hard-coded UID in the client. **The server does enforce it** (`validatePrivateUser`), so the risk is maintainability, not access | `constant.js PRIVATE_USER_ID` | Use a custom claim (see B8) |
| S3 | — | ~~Role and polling-station scoping enforced only by the UI.~~ **Resolved after backend review:** volunteers are scoped server-side to their `polling_station_id` on list and count routes. Remaining gaps are B2–B4 | | |
| S4 | P1 | `pass_key` is a shared, long-lived **plaintext** secret that gates destructive ops (`clear_voters_data`) and volunteer sign-up | `accounts.pass_key` | Rate-limit, audit-log, support rotation, hash at rest, confirmation step for clear |
| S5 | P1 | Google Maps Android API key hard-coded | `app.json` | Restrict it in GCP to package + SHA-1. Move it to `app.config.js` and read it from env |
| S6 | P1 | **Sensitive personal data** (caste, religion, political opinion, phone) handled without visible consent or retention controls. Subject to the DPDP Act 2023 | Voter model | Privacy policy, data-processing basis, retention / deletion policy, and access logs on the server. Never log voter rows |
| S7 | P1 | `console.log` of filters, error bodies and upload progress in production builds | sagas, `AppDataService` | Strip with `babel-plugin-transform-remove-console`, or a `logger` that is a no-op in prod |
| S8 | P2 | Third-party dashboards embedded via iframe / WebView (`vercel.app`, `champn.in`, `electiontoday.co.in`); native and web use different map URLs | `MapScreen.*`, `TrendAnalyticsScreen.*` | Own these domains or remove them. Restrict the WebView (`originWhitelist`) |
| S9 | P2 | Token refresh by `setInterval(60s)`; the `token` header is a mutable axios default | `useAuthentication.js` | Get the token in a request interceptor (`await auth.currentUser.getIdToken()` caches and auto-refreshes) and use `onIdTokenChanged` |
| S10 | P2 | `withCredentials: true` with header auth: unnecessary cookie exposure, and it requires credentialed CORS | `DataService.js` | Set it to false unless the server uses cookies |
| S11 | P3 | Firebase config is duplicated in 3 files | `firebaseConfig*.js` | One module and env vars; delete the dead `firebaseConfig.js` |

## Reliability and UX

| # | Sev | Finding | Fix |
|---|---|---|---|
| R1 | P1 | Errors are swallowed. `handleErrors` only logs, so users see empty lists and spinners that never stop on failures | Add `onError` to every saga and show a Snackbar or `EmptyState` with Retry |
| R2 | P1 | A 401 resolves `undefined`, so callers can't tell "logged out" from "no data" | Reject with a typed error after sign-out |
| R3 | P1 | No environment separation: `BASE_URL` and the Firebase project are hard-coded | `app.config.js` + `EXPO_PUBLIC_API_URL` etc., with dev / staging / prod EAS profiles carrying `env` |
| R4 | P1 | The first constituency is auto-selected, and there is no UI to switch | Add a picker if multi-constituency accounts exist |
| R5 | P2 | Route names are localized strings, so switching language mid-session breaks back-navigation, and deep links are impossible | Give routes stable ASCII ids and put the localized title in `options.title` |
| R6 | P2 | No offline support, but field volunteers often have poor connectivity | Queue canvassing mutations (approach / opinion / mobile) offline and sync later; cache voter pages |
| R7 | P2 | `ErrorPubSub` subscriber closure captures a stale `errorStatus` and dispatches on every response | Read the current state inside the callback (`store.getState()`), or compare in the reducer |
| R8 | P2 | `PollingDayScreen` shows static nulls; Live Voting isn't in the drawer | Wire it to `voters_voted_count` and register `LiveVotingScreen` |
| R9 | P3 | Five placeholder screens (Forum, Messages, Party Updates, Assign Task, Surname) show static images | Hide them behind a feature flag until built |

## Code quality

| # | Sev | Finding | Fix |
|---|---|---|---|
| Q1 | P1 | **No tests at all** | Jest + `jest-expo` + React Native Testing Library. Start with sagas (pure generators) and `Utility`, then critical screens |
| Q2 | P1 | No lint config, no CI | `npx expo lint` to generate `eslint.config.js`; GitHub Actions running lint + test + `expo export` |
| Q3 | P2 | `package.json` has a `reset-project` script pointing at the missing `scripts/`; `expo-router` is installed but unused | Remove both |
| Q4 | P2 | Dead screens and imports (see FEATURES.md § Dead code), including the 1,381-line `MapScreenInApp.js` | Delete them or register them |
| Q5 | P2 | ~37 near-identical `FilteredVoterListScreen/*` files | One `PresetVoterListScreen` that reads its preset from a config table (`route → filters`) |
| Q6 | P3 | Repetitive saga boilerplate (20 nearly identical workers) | A generic `apiWorker(serviceFn, responseKey)` factory, or migrate to RTK Query |
| Q7 | P3 | JavaScript only; `tsconfig.json` exists but nothing uses it | Migrate incrementally, starting with `services/` and `constant.js` |
| Q8 | P3 | `featureFlags.js` forces every flag to `true` | Read the flags from env or remote config |
| Q9 | P3 | Business enums duplicated client-side with no shared contract | Generate types from an OpenAPI spec published by the backend |

## Suggested roadmap

**Phase 0: today (security)**
**B1 SQL injection** · **B2 cross-tenant approval** · **B3 constituency header authorization** · S1 + B7 rotate the leaked keys and DB password · S5 restrict the Maps key.

**Phase 1: foundation (1–2 weeks)**
R3 env config · Q2 lint + CI · Q1 test harness with saga tests · S7 logger · R1/R2 error handling · remove dead code (Q3, Q4) · S9 token interceptor.

**Phase 2: product hardening**
R5 stable route ids · R6 offline canvassing queue · R8 polling day / live voting · R4 constituency picker · S6 privacy and compliance work · Q5 preset-screen consolidation.

**Phase 3: backend and database**
~~Bring the backend into version control~~ (done: `backend/`) · ~~verify DATA_MODEL.md against the live DB~~ (done) · B14 drift migration · B4–B6, B9 (consolidate the dynamic tables), B11, B12 · automated `pg_dump` backups off the droplet. Publish the swagger spec as the client contract. Add audit tables for `pass_key` use and data-collection changes.
