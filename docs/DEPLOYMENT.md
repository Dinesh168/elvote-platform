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
