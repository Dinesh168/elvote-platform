# ElVote API (backend)

The Express + Knex + PostgreSQL API for the ElVote Max app. In production it runs at `https://elvote.krishnakutumb.com/api` (pm2 process `elvote` on the DigitalOcean droplet, `/var/www/elvote/mobileappbe`).

The full documentation lives in the repo-level [`docs/`](../docs):

- [API.md](../docs/API.md): endpoints, auth, error codes
- [DATA_MODEL.md](../docs/DATA_MODEL.md): schema, including the dynamic per-tenant tables
- [DEVELOPMENT.md](../docs/DEVELOPMENT.md): local setup, adding endpoints, DB migrations
- [DEPLOYMENT.md](../docs/DEPLOYMENT.md): server topology and deploy steps
- [PRODUCTION_READINESS.md](../docs/PRODUCTION_READINESS.md): known security issues (read before changing models)

## Quick start

```bash
npm install
cp example.env .env                 # Postgres credentials
# serviceAccountKey.json            # Firebase Admin key for project elvote-aeb0e (never commit)
npm run run_next_migration          # once per pending migration
npm start                           # :3001, Swagger UI at /swagger-docs
```

## Layout

```
app.js                      Express setup (cors, body limits, fileupload, swagger, routes, error handler)
bin/main, bin/www           HTTP server bootstrap (PORT, default 3001)
knexfile.js                 DB connection from .env
src/routes/middleware/      RouteMap.js (Firebase auth + onboarding gate), schemaConstants.js, Swagger.js
src/routes/controllers/     users.js, voters.js, constituency.js, private.js (super-admin)
src/routes/routeWrappers.js prtWrapper / successResponsePrtWrapper
src/businesslogic/          *Manager.js service layer
src/models/                 *Model.js (Knex), libs/dbConstants.js (schema), migrations/
src/errorhandlers/          Typed errors → HTTP status (400–414, 500)
districtdata/               Seed data for district / constituency migrations
partydata/                  Voter-slip party data per account (JSON)
```

Secrets (`.env`, `serviceAccountKey.json`) and canvassing exports (`src/routes/controllers/sheets/*.xlsx`) are gitignored.
