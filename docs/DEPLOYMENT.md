# Deployment

## Production topology (verified 2026-11-17)

```
                        Cloudflare (DNS + proxy)
                                 │ HTTPS
            ┌────────────────────▼─────────────────────────────────────────┐
            │ DigitalOcean droplet  ubuntu-s-2vcpu-2gb-amd-blr1             │
            │ 64.227.142.163 · Ubuntu 24.04 · ssh alias `elvote-api` (root) │
            │                                                               │
            │ ufw: allow OpenSSH + Nginx Full only                          │
            │ nginx (+ certbot Let's Encrypt)                               │
            │   elvote.krishnakutumb.com  ──► localhost:3001  pm2 "elvote"  │
            │        /var/www/elvote/mobileappbe  (git repo; `npm start`)   │
            │        = backend/ in this repo                                │
            │   elvote-max.champn.in      ──► localhost:3002  pm2 "elvote-max"
            │        /root/elvote-max  (`serve -s dist -l 3002`)            │
            │        = web export of the client                             │
            │                                                               │
            │ PostgreSQL 16  127.0.0.1:5432  db/user `elvote`               │
            │ Node v24 · pm2 auto-start via pm2-root.service                │
            └───────────────────────────────────────────────────────────────┘
```

- No DB backup cron or dump directory was found on the droplet. **Set up automated off-box `pg_dump` backups before making any schema change.**
- The backend `.env` on the server has `NODE_ENV` unset in pm2 (the development CORS branch is active).

## Backend deploy (current manual process)

The user asked that no running service be disrupted, so do these steps only during an agreed window:

```bash
ssh elvote-api
cd /var/www/elvote/mobileappbe
pg_dump -U elvote -h localhost elvote | gzip > ~/elvote_$(date +%F_%H%M).sql.gz   # backup first
git pull                       # or copy the files from backend/
npm ci --omit=dev
npm run run_next_migration     # only if there are new migrations; repeat per migration
pm2 restart elvote && pm2 logs elvote --lines 50
```

Rollback: `git checkout <prev>` + `pm2 restart elvote`. A migration rollback is `npm run undo_last_migration`, but `down` migrations here only *rename* tables, so restore from the dump if needed.

Secrets on the server only: `/var/www/elvote/mobileappbe/.env` and `serviceAccountKey.json`. Never copy them into git.

## Web deploy (client)

```bash
npx expo export --platform web            # locally → dist/
scp -r dist elvote-api:/root/elvote-max/  # replace the folder; serve picks it up
```

## Client targets

| Target | How | Config |
|---|---|---|
| Android | EAS Build → AAB/APK | `app.json → android.package = com.akamit.elvotemax`, `eas.json` |
| iOS | EAS Build | `ios.supportsTablet`; no bundle identifier set yet |
| Web | `npx expo export --platform web` → static `dist/` | `web/index.html`, `public/` |

`app.json → extra.eas.projectId` ties builds to an EAS project, and `android.package` was set by the upstream author (`akamit`). **Confirm that you own both the EAS project and the Play Console listing before you publish.** If you don't, create your own project with `eas init` and pick a new package id.

## EAS profiles (`eas.json`)

| Profile | Use |
|---|---|
| `development` | Dev client, internal distribution |
| `preview` | Internal test builds (APK) |
| `production` | Store builds; `autoIncrement` build number; version source is `remote` |

```bash
npm i -g eas-cli
eas login
eas build --platform android --profile preview      # test APK
eas build --platform android --profile production   # Play Store AAB
eas submit --platform android --profile production
```

Android Play submission needs a Google service-account JSON. **Don't keep it in the repo.** Upload it to EAS (`eas credentials`), or reference a path outside git with `submit.production.android.serviceAccountKeyPath`.

## Web

```bash
npx expo export --platform web
# serve dist/ on any static host (Vercel, Netlify, Firebase Hosting, S3+CloudFront)
```

- This is a single-page app, so configure the host to rewrite every path to `/index.html`.
- The API is cross-origin with `withCredentials: true`. The backend's CORS policy must allow the web origin and credentials.
- Add the web domain to Firebase Auth → *Authorized domains*.

## Release checklist

- [ ] `BASE_URL` points at the production API (move this to env config; see PRODUCTION_READINESS P1)
- [ ] `FEATURE_FLAG.SHOW_SERVER_TIME` is off in production
- [ ] Bump `expo.version` in `app.json` (user-visible version)
- [ ] Smoke-test login, onboarding (410→411→approved), a voter list, a canvassing action, voter-slip print, and an admin dashboard
- [ ] Test on Android, Web, and iOS if it ships
- [ ] Tag the release in git: `git tag vX.Y.Z`

## Configuration inventory (where values live today)

| Value | Location | Secret? |
|---|---|---|
| API base URL | `constant.js` | No |
| Firebase web config | `firebaseConfig.native.js`, `firebaseConfig.web.js` | Public by design (protect with Auth rules / App Check) |
| Google Maps Android key | `app.json` | Restricted key: lock it to the package + SHA-1 in GCP |
| Super-admin UID | `constant.js → PRIVATE_USER_ID` | No, but it is authorization logic that belongs on the server |
| Play Console service account | `krishnakutumb-beaf6-*.json` (**committed**) | **Yes. Rotate it and remove it from the repo** |
| EAS project id | `app.json` | No |
| DB credentials, JWT secret | server `backend/.env` (template: `backend/example.env`) | **Yes.** Server only |
| Firebase Admin key | server `backend/serviceAccountKey.json` | **Yes.** Server only |

## ElVote v2 demo — demo.champn.in (deployed 2026-11-20)

Separate from the live app on the same droplet (spec `docs/specs/live-demo.md` D8). Nothing of the live app (`elvote` DB, pm2 `elvote` / `elvote-max`, their nginx sites) was changed. A dump of `elvote` taken before the set-up is in `/root/backups/` (mode 600).

| Part | Where |
|---|---|
| Website (static) | `/var/www/elvote-v2-demo` ← `scripts/build-demo-web.sh` (uses local `.env.demo`, not in git) |
| API | `/opt/elvote-v2-demo/api` (backend-v2 without tests), pm2 **`elvote-v2-demo`**, `127.0.0.1:4100`, `max_memory_restart 300M` |
| Settings / secrets | `/opt/elvote-v2-demo/api/.env` (mode 600, generated on the server: DB passwords, JWT, clear key, VAPID keys). `NODE_ENV=production`, `AUTH_MODE=firebase`, `FIREBASE_PROJECT_ID=elvote-max`, `DB_PREFIX=demo_` |
| Databases | `demo_elvote_core`, `demo_elvote_pb`, `demo_elvote_hr` on the existing PostgreSQL 16; roles `elvote_v2_owner` (CREATEDB, CREATEROLE, not superuser; migrations/seed) and `elvote_v2_api` (app) |
| nginx | `/etc/nginx/sites-available/demo.champn.in` (`/` → website, `/api/` → `127.0.0.1:4100/`), Let's Encrypt via certbot |
| Data | since 2026-11-23 real-data demo (spec real-demo-data): `python -I scripts/prep_real_demo.py <2027_data> <election-trend data>` on the owner's PC (names made up), then `npx tsx scripts/load-real-demo.ts <file> --demo` on the server; delete the file after. Databases now include `demo_elvote_up`. Old: `npx tsx scripts/seed.ts --demo`; super-admin: `npm run admin:super -- --email <owner email>` |
| Phone apps | Expo project `@dinesh1255/elvote-max` (`cf30fc3e-caf9-4362-9cf6-9ff710cb5afb`): Android APK = `eas build -p android --profile demo`; iPhone in Expo Go = `APP_VARIANT=demo EAS_PROJECT_ID=cf30fc3e-caf9-4362-9cf6-9ff710cb5afb eas update --channel demo --environment preview` (runtime `exposdk:58.0.0`). Public Firebase values and `google-services.json` are EAS environment variables (`preview`) |

Update the API: `pg_dump -Fc demo_elvote_core` to `/root/backups/` first; upload `backend-v2` (no `node_modules`, `test`, `.env`, `uploads`) to `/opt/elvote-v2-demo/api`, `npm ci` (only if the lock file changed), `npm run db:migrate`, `pm2 restart elvote-v2-demo`. Uploaded images live in `/opt/elvote-v2-demo/api/uploads`; never delete it.
Update the website: `bash scripts/build-demo-web.sh`, copy `dist-demo/` to `/var/www/elvote-v2-demo` (no nginx reload needed).
Remove the demo: `pm2 delete elvote-v2-demo && pm2 save`; remove the nginx site link + `systemctl reload nginx`; `certbot delete --cert-name demo.champn.in`; drop the `demo_elvote_*` databases and the `elvote_v2_*` roles; delete `/opt/elvote-v2-demo` and `/var/www/elvote-v2-demo`.
