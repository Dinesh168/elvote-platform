# Backend v2 + database v2 (REQ B1–B12) · status: built locally (2026-11-19)

Design proposal (approved by the owner: "start build front and backend locally"): https://claude.ai/artifact/G2osL1FjaDi7GHqJwHDWeH. That page holds the reasoning and every table; this file is the build spec. The SQL in `backend-v2/migrations/` is the source of truth for columns.

## Goal
A production-grade, low-cost, fast backend that holds 4–5 states (each with many ACs), runs locally with sample data now, and later moves to the droplet without touching the current production service.

## Decisions (owner-approved defaults, 2026-11-19)
| # | Decision |
|---|---|
| 1 | Central DB `elvote_core` + one DB per state `elvote_<st>` (same schema). Locally all on one PostgreSQL 16 |
| 2 | UUID v7 for small tables; state-prefixed `bigint` for `voters` and `contact_events` (state no. × 2^40 + sequence) |
| 3 | Every change kept in `contact_events` |
| 4 | Caste / religion in `voter_sensitive`, no API access, empty |
| 5 | `elections` table; poll marks belong to one election |
| 6 | Local PostgreSQL 16.15 via `embedded-postgres` (Docker Desktop not running and RAM is short); `docker-compose.yml` also provided |
| 7 | Old empty tenants are not migrated (migration of live data is a later step) |
| 8 | New TypeScript backend `backend-v2/` (Fastify 5, `pg`, zod). The old `backend/` is untouched |
| 9 | Background work (counters, imports) via a `jobs`/dirty-booth table polled by an in-process worker; no Redis |
| 10 | Old opinion `O` → contacted, no group |
| 11 | Stage 1 = one server |
| 12 | Phone caches its booth's voters; sync sends changes only |

## Requirements

### B1 Databases and migrations
- `npm run db:start` starts PostgreSQL (port 5544, data in `backend-v2/.pgdata`, gitignored). `npm run db:migrate` creates `elvote_core`, `elvote_pb`, `elvote_hr`, the DB roles, and applies `migrations/core/*.sql` and `migrations/state/*.sql` (tracked in `schema_migrations`). Re-running is a no-op.
- Partitions: `voters`, `voter_contacts`, `poll_marks` by `LIST (ac_no)` (created when an AC is added); `contact_events`, `audit_log` by month (+ default).
- **Acceptance:** after migrate, every table of the proposal exists in each DB; running migrate twice changes nothing.

### B2 Sample data
- `npm run db:seed` (deterministic): states PB (ACs 66 Rampur, 50 Nawanpind) and HR (AC 12 Sonpur); 25 + 20 + 12 booths; ~800–1,300 voters per booth, house by house; 2 parties; ~40% contacted with 14 days of events; 3 drives; 10 zones per party-AC; booth strength; 3 pending volunteers; a sample election with some voted marks.
- Fixed login numbers (dev OTP `123456`): super-admin `9000000001`, admin `9000000002` (party 1 in AC 66 and AC 50), volunteer `9000000003` (Suresh Kumar, booths 112 and 113 of AC 66), second-party admin `9000000004` (party 2, AC 66).
- All names synthetic. **Acceptance:** seed twice → same counts; counters equal raw counts.

### B3 Auth
- `POST /v1/auth/otp/request {mobile}` → 200; `POST /v1/auth/otp/verify {mobile, code}` → `{accessToken, refreshToken, user}`. `AUTH_MODE=dev` accepts `123456`; production mode verifies a Firebase ID token instead (`POST /v1/auth/firebase {idToken}`), wired but not testable locally.
- Access token: JWT HS256, 15 min. Refresh token: random 32 bytes, stored hashed in `sessions`, 30 days, rotated on use. `POST /v1/auth/refresh`, `POST /v1/auth/logout`.
- Rate limit: 5 OTP requests per mobile per 10 min, 5 wrong codes → locked 10 min.
- **Acceptance:** wrong code → 401 `otp_invalid`; 6th wrong → 429; expired access token → 401.

### B4 Me and roles
- `GET /v1/me` → user, `isSuperAdmin`, memberships `[ {id, partyId, partyName, stateCode, acNo, acName, role, status, booths[]} ]`.
- Onboarding: `POST /v1/join {code, name, epic?, booths[]}` → pending membership; admin approves.
- **Acceptance:** volunteer gets role volunteer with booths [112, 113]; super-admin flag only for platform_admins.

### B5 Volunteer data (scoped to the volunteer's booths; admins see their AC)
- `GET /v1/m/:membershipId/booths`, `GET /v1/m/:mid/voters?booth=112[&since=ISO]` (full list or changes since), `GET /v1/m/:mid/tasks`.
- `POST /v1/m/:mid/voters/:voterId/changes {opId, clientAt, patch}` (patch: group | residence | needsHelp | mobile | voted). Idempotent on `opId`. Writes `voter_contacts`/`poll_marks` + `contact_events`, marks the booth dirty.
- **Acceptance:** volunteer reading booth 114 → 403; same opId twice → stored once; another party never sees the change.

### B6 Admin dashboard
- `GET /v1/m/:mid/dashboard?zone=&booth=` → all A-DASH-1…4 counts from `stats_booth`; charts: groups, age bands, booth strength, houses by group, zone performance, 7-day trend; top 10 workers.
- **Acceptance:** numbers equal a raw recount on the seed; zone filter = sum of that zone's booths.

### B7 Zones
- Super-admin sets `max_zones` (`PATCH /v1/admin/party-acs/:id {maxZones}`); admin sets `zone_count` (`PUT /v1/m/:mid/zones/count {count}`), renames zones, moves booths (`PUT /v1/m/:mid/zones/booths {boothId, zoneId|null}`). Lowering count removes the highest zones; their booths become unassigned.
- **Acceptance:** count > max → 422; reducing 10 → 8 leaves Z9/Z10 booths unassigned.

### B8 Team
- `GET /v1/m/:mid/team?status=pending|approved&q=`; `POST /v1/m/:mid/team/:membershipId/approve {booths[]}`; `.../reject {reason}`.
- **Acceptance:** volunteer calling it → 403; approve audited.

### B9 Drives
- `GET/POST /v1/m/:mid/drives`, `DELETE /v1/m/:mid/drives/:id`; progress = contacted in segment within dates ÷ segment size, per zone.

### B10 Polling day (admin)
- `GET /v1/m/:mid/poll` → poll % overall, per zone, booth list lowest first with our-not-voted, help pending.

### B11 Super-admin
- Parties: `GET/POST /v1/admin/parties`. Party ACs: `GET/POST /v1/admin/party-acs`, `PATCH …/:id` (maxZones, status). Admins: `POST /v1/admin/admins {mobile, name, partyAcId}`. Super-admins: `GET/POST/DELETE /v1/admin/super-admins` (cannot remove the last one). States/ACs: `GET /v1/admin/states`, `GET /v1/admin/overview` (totals per state from counters).
- Roll upload: `POST /v1/admin/imports` (multipart CSV or XLSX, AC) → job; worker validates into staging, `GET /v1/admin/imports/:id` progress + errors, `POST …/:id/confirm` merges. Clear party data: `POST /v1/admin/party-acs/:id/clear {passKey, confirmAcNo}`; only that party's rows.
- **Acceptance:** admin calling any `/v1/admin/*` → 403; clear without matching AC number → 422; clear keeps the roll and other parties' data.

### B12 Security & ops
- Bound parameters only; zod on every input; party tables have FORCE row-level security on `party_id = current_setting('app.party_id')`; the API connects as `elvote_api` (no DDL, no TRUNCATE, no `voter_sensitive`).
- Every admin/super-admin write → `audit_log` (IDs and counts only). No voter data in logs (pino redaction). `/health` and `/ready`. Helmet headers, CORS allow-list, body limit.

## Non-functional
| Area | Requirement |
|---|---|
| Speed | Change write < 100 ms local; dashboard < 300 ms on seed; booth voters < 500 ms |
| Security | B3, B12; secrets only in `.env` (gitignored) |
| Privacy | Synthetic seed; no PII in logs or audit |
| Tests | Vitest + real local PostgreSQL (`elvote_test_*` DBs); `npm test` in `backend-v2/` |

## Built notes (2026-11-19)
- `elections` lives in each state DB (a state's elections belong to that state), not in core.
- Background work runs as an in-process worker over `stats_dirty` (no pg-boss yet); imports are merged in the request's background task.
- The upload runs as `elvote_api`; a separate `elvote_import` role is a known gap for production.
- Local Postgres is 16.10 (embedded-postgres package); production is 16.15.

## Out of scope (this step)
Deploy to the droplet, migrating live production data, real Firebase OTP test, map tiles, load test (k6 later).
