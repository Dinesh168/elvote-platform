# Security fixes (review of 2026-11-24)

From a full-code security review. Owner asked: "fix issues".

## SF1 Super-admin routes are checked by the matched route (critical)
- Problem: the super-admin check compared the raw URL text with `/v1/admin/`. The router decodes `%xx` before matching, so
  `/v1/%61dmin/...` reached super-admin routes as any signed-in user.
- Fix: the sign-in hook (`app.ts`) and the platform hook (`platform.ts`) use the matched route pattern
  (`req.routeOptions.url`). Any route under `/v1/admin/` needs a super-admin, wherever it is registered.
  Public routes (`/health`, `/ready`, `/v1/auth/*`, `/files/*`, `/v1/push/vapid-key`) are decided the same way; an unknown
  path needs sign-in.

## SF2 Polling-day find is rate limited
- `GET /v1/m/:mid/polling/find` shows voters of the whole assembly (name, age, relative; no phone, group or notes).
- One person may search at most 30 times a minute (per API process). More → 429 `find_rate` "Too many searches. Wait a
  minute and try again." Enough to serve a queue at a booth, too slow to copy the roll.

## SF3 Map scripts are pinned
- Leaflet 1.9.4 and markercluster 1.5.3 (jsDelivr) load with `integrity` (sha384) and `crossorigin="anonymous"`.
  A changed file on the CDN is not run. Upgrading either library means updating the hashes in `mapHtml.ts`.

## Not changed (noted)
- Web keeps the refresh token in browser storage; moving it to an httpOnly cookie is a larger change (later).
- Sign-in and find limits are per API process; move to Redis/Postgres when there is more than one API process.
- `npm audit`: remaining warnings are in build tools or the unused `firebase` web package, not in request handling.
