# ElVote backend v2

TypeScript API (Fastify 5 + PostgreSQL 16) for the v2 app. Spec: [`../docs/specs/backend-v2.md`](../docs/specs/backend-v2.md). Database design: https://claude.ai/artifact/G2osL1FjaDi7GHqJwHDWeH.

The old `../backend/` and the production server are not touched by anything here.

## Run everything locally (Windows, macOS, Linux)

You need Node.js 20+ only. No Docker needed.

```bash
# 1. Install (once)
cd backend-v2
npm install
cp .env.example .env            # local values; never commit .env

# 2. Terminal A: start the database (keep it open)
npm run db:start                # PostgreSQL 16 on 127.0.0.1:5544, data in backend-v2/.pgdata

# 3. Terminal B: create databases + sample data (once, or any time to reset)
npm run db:migrate
npm run db:seed                 # ~60,000 synthetic voters, ~10 s

# 4. Terminal B: start the API
npm run dev                     # http://localhost:4000  (health: /health)

# 5. Terminal C: start the app (repo root)
cd ..
npm run web                     # opens the app in the browser
```

Android emulator: `npm run android` (the app calls `http://10.0.2.2:4000`). A real phone on the same Wi-Fi: set `EXPO_PUBLIC_API_URL=http://<your-PC-IP>:4000` and add that origin to `CORS_ORIGINS`.

### Test logins (code is always `123456` in local mode)

| Mobile | Role | What you see |
|---|---|---|
| 9000000001 | Super-admin | All states, parties, max zones, voter-roll upload, super-admins, clear data |
| 9000000002 | Admin, Jan Vikas Party, AC 66 Rampur and AC 50 Nawanpind | Dashboard with charts, map, team approvals, drives, zones, polling day, branding |
| 9000000003 | Volunteer Suresh Kumar, booths 112 and 113 | Home, voters, polling day |
| 9000000004 | Admin, Lok Sewa Dal, AC 66 | Same AC as 9000000002, but only its own party's data |
| 9000000005 | Admin, Lok Sewa Dal, HR AC 12 Sonpur | Haryana data |
| any other 10-digit number | New user | Join with code `RAMPUR24`, `NAWAN50`, `LSD66` or `SONPUR12`, then wait for approval |

Clear-data pass key (local only): `local-clear-key`. Sample roll to try the upload: `samples/sample-roll.csv` (150 synthetic voters, 3 booths; upload as a new AC, e.g. PB 77).

## Commands

| Command | What it does |
|---|---|
| `npm run db:start` | Local PostgreSQL 16 (Ctrl+C stops it) |
| `npm run db:migrate` | Creates `elvote_core`, `elvote_pb`, `elvote_hr`, the `elvote_api` role, tables and grants. Safe to re-run |
| `npm run db:seed` | Wipes and reloads the sample data |
| `npm run db:reset` | Drops the local databases, migrates and seeds |
| `npm run dev` | API with auto-reload |
| `npm test` | 55 tests against separate test databases (`t_elvote_*`); your sample data is not touched |
| `npm run typecheck` | TypeScript check |

## How it is built

- **Databases:** one central DB (users, parties, memberships, join codes, sessions, audit log) and one DB per state (roll, party contacts, history, polling day, zones, drives, imports, counters). The API finds a state's DB through `core.shards`, so a state can move to another server by changing one row and one env var.
- **Security:** the API connects as `elvote_api` (no schema changes, no TRUNCATE, no caste/religion table). Party tables have row-level security, so a query can only see the party set for that request. All SQL uses bound parameters; all input is validated with zod. Admin and super-admin writes go to `audit_log` (IDs and counts only).
- **Speed:** dashboards read pre-computed `stats_booth` rows. A write marks its booth dirty; a worker in the API recomputes dirty booths every 3 s.
- **Auth:** `AUTH_MODE=dev` accepts code `123456` and sends no SMS. `AUTH_MODE=firebase` verifies Firebase phone-auth ID tokens (`POST /v1/auth/firebase`); the app side of Firebase sign-in is still to do. Access token 15 min; refresh token 30 days, rotated on every use and stored hashed.
