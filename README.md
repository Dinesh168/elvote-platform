# ElVote Max

ElVote Max is a cross-platform (Android · iOS · Web) **election campaign management app**. Party admins use it to monitor a constituency (Assembly Constituency, "AC"). Field volunteers use it to canvass voters booth by booth: they mark voters as *approached*, capture opinion, mobile number and migration status, print voter slips, and track who has voted on polling day.

This is a **monorepo**:

| Path | Part | Stack |
|---|---|---|
| `/` | Client app | Expo SDK 54, React Native 0.81, React 19, Redux + redux-saga (`@betacrew/jars-flux`), React Navigation 7, react-native-paper |
| [`backend/`](backend/) | REST API | Node.js, Express 4, Knex, **PostgreSQL**, firebase-admin, node-xlsx |
| (external) | Auth | Firebase Authentication, project `elvote-aeb0e` (email + password) |

Production: API at `https://elvote.krishnakutumb.com/api` (Cloudflare → DigitalOcean droplet). Postgres runs on the same droplet.

## Quick start

```bash
# client
npm install
npm run web            # or: npm run android / npm run ios

# backend (optional; by default the client talks to production)
cd backend
npm install
cp example.env .env    # fill in Postgres credentials
# put the Firebase Admin key at backend/serviceAccountKey.json (ask the owner; never commit it)
npm run run_next_migration   # repeat until all migrations are applied
npm start                    # http://localhost:3001/api, Swagger at /swagger-docs
```

To point the client at a local backend, change `BASE_URL` in `constant.js`. Full setup is in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Documentation

| Doc | What it covers |
|---|---|
| [CLAUDE.md](CLAUDE.md) | **Start here if you are an AI agent.** Rules, conventions, gotchas |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System context, client boot flow, auth gating, backend layers |
| [docs/API.md](docs/API.md) | Every endpoint, with payloads, responses and error codes |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | PostgreSQL schema (static + dynamic per-tenant tables), enums, XLSX import format |
| [docs/FEATURES.md](docs/FEATURES.md) | Screen inventory by role, with status (live / stub / dead) |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Setup, conventions, recipes (screens, endpoints, DB changes) |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | EAS builds, web export, backend on DigitalOcean, release checklist |
| [docs/PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md) | Security findings (client + backend), tech debt, roadmap |
| [docs/GLOSSARY.md](docs/GLOSSARY.md) | Indian-election domain terms (AC, Part No, EPIC, booth…) |

## Repository layout

```
App.js, index.js          Client entry point and provider tree
NavigationStack.js        Root stack: auth gate + onboarding gate + pushed screens
InitStack.js              Drawer navigator (main app after login), role-based menu
constant.js               BASE_URL, enums, filter keys, ROUTES, LIST_TYPE
strings.js                All UI strings (en/hi/mr)
theme.js                  Design tokens
services/                 One class per API area: Voters, Users, Constituency, Private
storemanagement/<area>/   <Area>Slice.js (reducer) + <Area>Saga.js (side effects)
screens/, components/     UI; SingleComposite is the screen composer
backend/
  app.js, bin/www         Express app and HTTP server (port 3001)
  src/routes/             middleware/RouteMap.js (Firebase auth + onboarding gate), controllers/*.js
  src/businesslogic/      *Manager.js: thin service layer over models
  src/models/             Knex models; libs/dbConstants.js = schema; migrations/
  districtdata/           District/AC seed JSON (used by migrations)
  partydata/              Per-account voter-slip data (JSON)
```

## Status

**Not production-ready.** The backend has critical security issues (SQL injection, cross-tenant access), and secrets have leaked. Read [docs/PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md) first.
