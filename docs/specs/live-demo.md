# Live demo at demo.champn.in (REQ D1–D10) · status: confirmed (2026-11-20); sign-in changed — see note


> **Change 2026-11-20:** the owner chose **no SMS for now**. D1/D2 (SMS code sign-in) are replaced by Google and email sign-in in `docs/specs/accounts-access.md` (AC1–AC2). D3–D10 still apply. TC-LD-D1-* are superseded by TC-AA-U1/U2.
Owner (2026-11-20): "things you have to make production or live demo to check all functionality working or not." Answers: same server as the live app; address demo.champn.in; real SMS (Firebase); website and APK, iOS if possible. Plan confirmed 2026-11-20.

## Goal
A demo of the new app (website + Android APK) that the owner can use with real phones and real SMS, running next to the live app on the same droplet **without touching the live app**, filled with **made-up sample data only**.

## Decisions
| # | Decision |
|---|---|
| DD1 | Firebase project **`elvote-max`** (separate from the live app's `elvote-aeb0e`): web app "ElVote demo web", Android app `in.champn.elvote.demo`; phone sign-in on; `demo.champn.in` authorised |
| DD2 | iPhone: **the website in Safari** for now; a native iOS build needs an Apple Developer account (later) |
| DD3 | Anyone can receive a code, but only numbers added as super-admin/admin/volunteer (or joining with a code) see any data — the app's normal rules |
| DD4 | Firebase default SMS limits (10 SMS/day without billing). Firebase **test numbers** may be added for free testing |
| DD5 | Demo server: new DBs `demo_elvote_core`, `demo_elvote_pb`, `demo_elvote_hr`; own roles; pm2 `elvote-v2-demo` on 127.0.0.1:4100; static website; one new nginx site + certificate. The live app's DB `elvote`, its pm2 processes and nginx sites are not changed |
| DD6 | First super-admin: the owner's mobile, given at deploy time (`DEMO_SUPERADMIN`) |

## Requirements

### D1 Real SMS sign-in on the website
- When the app is built with `EXPO_PUBLIC_AUTH_MODE=firebase`, "Send code" asks Firebase (JS SDK, invisible reCAPTCHA) to text the code to +91 mobile; "Verify" confirms it with Firebase, takes the Firebase ID token and calls `POST /v1/auth/firebase`; the server's own tokens are stored as today.
- The dev-code box is never shown in this mode. "Resend code" is available after 30 s. "Change number" resets.
- Errors in plain language (en/hi/pa): wrong code, code expired, too many attempts / daily SMS limit reached ("Try again later"), no internet, robot check failed.
- *Given* the demo website, *when* a person enters their mobile and the SMS code, *then* they are signed in and land where their role says (super-admin → platform, admin → dashboard, volunteer → home, nobody → join/waiting).

### D2 Real SMS sign-in on Android
- Same screen and flow; on Android the native Firebase SDK (`@react-native-firebase/auth`) sends and checks the code (Play Integrity, reCAPTCHA fallback). It needs the APK's SHA-1/SHA-256 in Firebase.
- Expo Go and local builds without `EXPO_PUBLIC_AUTH_MODE=firebase` keep the dev code flow (D3), and never load the native Firebase module.

### D3 Local/dev sign-in unchanged
- `AUTH_MODE=dev` (server) / no `EXPO_PUBLIC_AUTH_MODE` (app): code 123456 shown on screen, exactly as today. Server refuses `AUTH_MODE=dev` in production (exists).

### D4 Sign out
- Signing out also signs out of Firebase on that device, so the next person must verify their own number.

### D5 App variant for the demo build
- `app.config.ts` reads `app.json` and, when `APP_VARIANT=demo`: name "ElVote Demo", Android package `in.champn.elvote.demo`, `googleServicesFile` = `./google-services.json`, the Firebase plugins, and the EAS project id from `EAS_PROJECT_ID`. Without `APP_VARIANT` the config is unchanged.
- `eas.json` profile `demo`: Android **APK**, internal distribution, env `APP_VARIANT=demo`, `EXPO_PUBLIC_API_URL=https://demo.champn.in/api`, `EXPO_PUBLIC_AUTH_MODE=firebase`. The Firebase values are not in git: the website build reads `.env.demo` (`scripts/build-demo-web.sh`), the APK reads `google-services.json` and EAS environment variables (`preview`).

### D6 Server settings for running behind nginx
- `HOST` env (default `0.0.0.0`); the demo binds `127.0.0.1` so the API port is not reachable from outside.
- `DB_PREFIX` (exists) names the demo databases for both the API and the scripts.

### D7 Demo data
- `npm run db:seed` refuses to run when `NODE_ENV=production` unless `--demo` is passed **and** the core DB name starts with `demo_` (the seed wipes data).
- `DEMO_SUPERADMIN=<10-digit mobile>` makes that number a super-admin after seeding. Sample voters are synthetic (seed + `samples/*.csv`).

### D8 Server deploy (approved steps only)
1. Read-only checks (memory, ports 4100 free, DNS points to the droplet).
2. `pg_dump` of the live `elvote` DB to `/root/backups/` before any change to the Postgres cluster (insurance; the live DB itself is not altered).
3. As `postgres`: create roles `elvote_v2_owner` (LOGIN CREATEDB, not superuser) and `elvote_v2_api` (LOGIN, no create, no bypass RLS); migrate/seed run as `elvote_v2_owner`.
4. Code in `/opt/elvote-v2-demo` (backend-v2 only + built website); `.env` mode 600 with random `JWT_SECRET`, `CLEAR_PASS_KEY`, DB passwords; `NODE_ENV=production`, `AUTH_MODE=firebase`, `FIREBASE_PROJECT_ID=elvote-max`, `CORS_ORIGINS=https://demo.champn.in`.
5. pm2 `elvote-v2-demo` (`max_memory_restart 300M`), `pm2 save`.
6. nginx site `demo.champn.in`: `/` → static website (single-page fallback), `/api/` → `127.0.0.1:4100/`; `nginx -t` then **one `reload`** (approved); certbot for the certificate.
- Rollback: `pm2 delete elvote-v2-demo`, remove the nginx site + reload, drop the `demo_*` DBs and roles. None of this touches the live app.

### D9 Android APK
- `eas build -p android --profile demo` → APK link the owner installs. After the first build, its SHA-1 and SHA-256 are added to the Firebase Android app.

### D10 iPhone
- Safari on demo.champn.in: everything except background location (polling-day tracking works only while the page is open) and phone push notifications. Listed as a known gap.

## Data / API changes
- No DB schema change. Backend: `HOST` env; seed guard + `DEMO_SUPERADMIN`. App: Firebase phone adapter (`src/features/auth/phoneAuth.ts` web, `phoneAuth.native.ts` Android), login screen uses it; `app.config.ts`; `eas.json` `demo` profile; `.gitignore` covers `google-services.json` and `.env.*`.

## Non-functional
- **Security:** server secrets only in the server `.env` (600), never in git; the Firebase config in the app is public by design; the API verifies Firebase ID tokens against Google keys with issuer/audience `elvote-max`; the API listens on localhost only; HTTPS only.
- **Live app safety:** no change to DB `elvote`, pm2 `elvote`/`elvote-max`, or their nginx sites; demo API capped at 300 MB; pg_dump before cluster changes.
- **Privacy:** Firebase receives phone numbers only; sample data only — no real voter roll is uploaded to the demo unless the owner decides later.
- **i18n / a11y:** new messages in en/hi/pa; sign-in screen stays axe-clean.
- **Offline:** sign-in needs internet (as today); after sign-in the app works offline as before.

## Known gaps
- 10 real SMS/day until billing is added (use Firebase test numbers for repeated testing).
- iOS native app (Apple account), background location and push on iPhone.
- `google-services.json` and the EAS project must exist on the build machine (not in git).

## Out of scope
- Moving the live app to the new app/backend; real voter data on the demo; Play Store / App Store release.
