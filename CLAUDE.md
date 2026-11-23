# CLAUDE.md: guide for AI agents

Read this file before you change anything. It is the entry point for any coding agent (Claude Code, Codex, Cursor, etc.). `AGENTS.md` points here.

**Resuming work? Read `docs/HANDOFF.md` first** — it says where the last session stopped and what is waiting for the owner.

## What this repo is

ElVote Max is an election campaign app: admins monitor a constituency, volunteers canvass voters. This is a monorepo with two parts:

| Path | What | Stack |
|---|---|---|
| `/` (root) | Mobile and web **client** | Expo SDK 54, React Native 0.81, Redux + redux-saga |
| `backend/` | REST **API** | Node.js, Express 4, Knex, **PostgreSQL**, firebase-admin |

Production API: `https://elvote.krishnakutumb.com/api` (Cloudflare → DigitalOcean droplet `64.227.142.163`; Postgres runs on the same droplet, `localhost:5432`, db `elvote`).

A feature usually touches four places: a backend route (`backend/src/routes/controllers/`) → Manager (`backend/src/businesslogic/`) → Model / SQL (`backend/src/models/`), then the client service (`services/`) → saga → component.

## Mandatory workflow for every change (owner's rule)

**Procedure → user confirmation → spec/md → test cases → code → verify → ship.** Never write code first, and never write specs before the user confirms the restated requirements. The full steps are in the `elvote-change` skill (`.claude/skills/elvote-change/SKILL.md`); load it for any request to add, change, remove or fix something.

**Quality bar: a proper production app** (Android, iOS, Web) with a **scalable backend**, not a prototype. Every change must meet the `elvote-production` skill (security, privacy/DPDP, offline, performance budgets, backend scalability for 15M voters and 10k concurrent polling-day users, tests + CI, a11y, i18n, observability, store compliance, release engineering) and its Definition of Done. UI work also follows the `elvote-ui` skill.

The UI is being rebuilt from scratch on `docs/DESIGN_SYSTEM.md` (plan: `docs/REDESIGN_PLAN.md`). Don't extend the old `theme.js` / react-native-paper screens.

## Where to look

| Task | Read first |
|---|---|
| Understand boot / login / role routing | `docs/ARCHITECTURE.md`, `NavigationStack.js`, `InitStack.js` |
| Call or add an API endpoint | `docs/API.md`, `services/*DataService.js`, `backend/src/routes/controllers/*.js` |
| DB tables, columns, enums, XLSX import | `docs/DATA_MODEL.md`, `backend/src/models/libs/dbConstants.js` |
| Change the DB schema | `docs/DEVELOPMENT.md § Database changes`; **read the dynamic-tables section first** |
| Which screens exist and work | `docs/FEATURES.md` |
| How to add a screen / filter / string / saga | `docs/DEVELOPMENT.md` |
| Security issues, what blocks production | `docs/PRODUCTION_READINESS.md` |

## Commands

```bash
# client (repo root)
npm install
npm run web | android | ios     # dev servers (expo start)
npx expo export --platform web  # production web build -> dist/
eas build --profile production  # native builds

# backend
cd backend && npm install
cp example.env .env             # fill in DB creds; also needs serviceAccountKey.json (Firebase Admin, NOT in git)
npm start                       # http://localhost:3001/api, docs at /swagger-docs
npm run run_next_migration      # apply the next Knex migration
npm run create_migration -- <name>
```

**Neither part has tests, an ESLint config or CI.** Verify client changes by running the app (`npm run web` is the fastest loop). Verify backend changes against a **local** Postgres, never the production DB.

## Conventions (follow these)

1. **Data flow is always Screen → dispatch(saga action) → Saga → `XDataService` → `AppDataService` (axios).** Screens never call services or axios directly.
2. **Sagas return results through callbacks** in the action payload (`onSuccess`, `onComplete`, `onError`, `callback`), not through the store. Most list and count data lives in component `useState`. Follow this pattern for consistency.
3. **Slices and sagas self-register when imported.** `store.reducerManager.add({...})` and `store.sagaManager.addSaga(key, rootSaga)` run as module side effects. A new slice must be imported somewhere, and its `componentKey` must be unique.
4. **All user-visible text goes in `strings.js`** via `L({ en, hi, mr })`, read through `STRINGS.KEY`. Hindi and Marathi fall back to English when left empty.
5. **Enum-like constants that carry labels are factories** (`_GENDERS()`, `_ROUTES()`…). `LanguageWrapper` re-runs them when the language changes. If you add a labelled enum, add it to the update list in `components/languagewrapper/LanguageWrapper.js`.
6. **Styling uses `THEME` tokens** from `theme.js` (`THEME.COLOR.*`, `THEME.SPACING.*`, `THEME.FONT_SIZE.*`). Use `useResponsive()` for breakpoints. Don't hard-code colors.
7. **Most screens are thin.** They render `<SingleComposite flagA flagB filtersObj={...} navigation={navigation} />`, and `SingleComposite` decides which widgets to show. Before you build a new screen, check whether a new flag on `SingleComposite` does the job.
8. **Platform-specific files** use Metro suffixes: `X.native.js` / `X.web.js`. Import them as `./X` with no suffix.
9. API payload keys are **snake_case**, while JS variables are camelCase. Services handle the mapping.

## Gotchas (these have caused bugs)

- **Route names are translated strings.** `ROUTES.LOGIN === STRINGS.LOGIN_SCREEN_TITLE`, so a route's name changes when the language changes. Always navigate with `ROUTES.X`, never with a string literal. Deep linking is not possible as-is.
- **Module-level constants freeze strings at import time.** For example, the `INITIAL_FILTER_SORT` labels in `FilterSortSlice.js` stay in the import-time language. Compute labels inside render or a factory instead.
- **The constituency header is global mutable state.** `selectConstituency` writes `x-constituency` into `RequestInterceptorPub.headers`, and every request picks it up.
- **The auth token is a custom `token` header**, not `Authorization`. It is set in `useAuthentication` and refreshed every 60 s.
- **A 401 response signs the user out and resolves to `undefined`; it does not throw.** Sagas guard with `if (response && response.status === 200)`. Keep that guard.
- **Onboarding state is driven by HTTP status codes 410–413** through `ErrorPubSub`, which swaps the whole navigator (see ARCHITECTURE.md). Every *successful* response resets the error status to `null`.
- **Super-admin is a hard-coded Firebase UID** in both `constant.js` (`PRIVATE_USER_ID`) and `backend/src/routes/controllers/private.js` (`validatePrivateUser`). Change both together.

### Backend gotchas

- **Voter and canvassing tables are dynamic, one set per tenant:** `voters_<C>`, `data_collection_<C>_<A>`, `live_voting_<C>_<A>`, `polling_station_for_party_<C>_<A>`. They are created by API calls (`create_constituency`, `create_account`), **not migrations**. Schema changes must alter every existing table that matches the pattern *and* update the `createTable` code. See DATA_MODEL.md § 1.
- **`constituency_number_id` columns hold the constituency *number*,** not `constituency.id`.
- **Never interpolate request values into `knex.raw()`.** The existing code does this (SQL injection, PRODUCTION_READINESS B1). Use `?` bindings, and don't copy the existing pattern.
- Caller identity comes from `res.locals[LOCAL_INFO_KEY]` (set in `RouteMap.authenticate`). Never trust ids in the body for authorization.
- Volunteer scoping (`polling_station_ids = [user.polling_station_id]`) is done per route in the controllers. Any new list or count route must repeat it.
- Throw the typed errors in `backend/src/errorhandlers/` (`InvalidInputError` → 414, `AccessPermissionError` → 403, …). Wrap handlers in `prtWrapper` (you send the JSON) or `successResponsePrtWrapper` (it sends the success response).
- Every table uses soft delete (`is_deleted`). Filter `is_deleted = false` in every query.
- `firebaseConfig.js` (no suffix) is effectively dead. Metro resolves `.native.js` / `.web.js` first.
- Several screens are imported in `InitStack.js` but never registered, and some screens are image or "coming soon" placeholders. Check `docs/FEATURES.md` before you assume a feature works.

## Safety rules

- **Never commit secrets.** `krishnakutumb-beaf6-*.json` is a leaked service-account key, so don't copy, print or reference its contents. `backend/.env` and `backend/serviceAccountKey.json` (Firebase **Admin**) are gitignored; keep it that way. Keep Google Maps and Firebase keys out of new files.
- **The production database is off limits for writes.** Connect read-only (`PGOPTIONS='-c default_transaction_read_only=on'`) and run only schema or aggregate queries. Never `SELECT` voter rows into the conversation or into files. Run migrations on a local or staging copy first, and on production only with explicit user approval and a fresh `pg_dump` backup.
- Never commit `backend/src/routes/controllers/sheets/*.xlsx`; these are canvassing exports containing PII.
- Voter records contain **sensitive personal data** (caste, religion, political opinion, phone). Don't log voter objects. Don't add analytics or third-party calls that send voter data.
- Upload and clear-voter-data operations are destructive and protected by a `pass_key`. Don't add code paths that call them without explicit user confirmation in the UI.
- Commit only when the user asks. Branch off `master` first.

## Keeping docs current

When you add or remove a screen, endpoint, slice, filter key, enum, table or column, update the matching doc (`FEATURES.md`, `API.md`, `DATA_MODEL.md`) in the same change.
