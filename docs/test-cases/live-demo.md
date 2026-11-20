# Test cases: live demo + Firebase sign-in (spec `docs/specs/live-demo.md`)

Status: ⬜ not run · ✅ pass · ❌ fail. api = vitest; unit = Jest; ui = puppeteer; manual = on the real demo.

| ID | Req | Type | Steps | Expected | Status |
|---|---|---|---|---|---|
| TC-LD-D1-1 | D1 | unit | Login in firebase mode: mobile → Send code (adapter mocked) → code → Verify | adapter `send('+91…')` called; `confirm(code)` → ID token posted to `/v1/auth/firebase`; tokens saved; no dev-code box | ✅ |
| TC-LD-D1-2 | D1 | unit | Adapter throws `auth/invalid-verification-code`, `auth/code-expired`, `auth/too-many-requests`, `auth/network-request-failed` | plain-language message for each; code field cleared on wrong code | ✅ |
| TC-LD-D1-3 | D1 | unit | Resend before / after 30 s | disabled with countdown, then enabled; calls `send` again | ✅ |
| TC-LD-D3-1 | D3 | unit | Login without firebase mode | dev flow as today (`/v1/auth/otp/*`, dev code shown) | ✅ |
| TC-LD-D4-1 | D4 | unit | Sign out in firebase mode | adapter `signOut()` called | ✅ |
| TC-LD-I18N | D1 | unit | en/hi/pa key parity for new `auth.*` keys | equal | ✅ |
| TC-LD-D6-1 | D6 | api | Config with `HOST=127.0.0.1` | parsed; default `0.0.0.0` | ✅ |
| TC-LD-D7-1 | D7 | api | Seed guard: production without `--demo`; production with `--demo` but core DB not `demo_*`; production + `--demo` + `demo_` | refuses, refuses, allowed | ✅ |
| TC-LD-D7-2 | D7 | api | `DEMO_SUPERADMIN=98xxxxxxxx` after seed | that mobile is an active platform admin; bad number → error | ✅ |
| TC-LD-SEC-1 | security | api | `/v1/auth/firebase` with a token for another project / forged | 401 `firebase_invalid` (existing test kept green) | ⬜ |
| TC-LD-D5-1 | D5 | unit | `app.config.ts` with and without `APP_VARIANT=demo` | demo: package `in.champn.elvote.demo`, googleServicesFile, plugins; default: unchanged from app.json | ✅ |
| TC-LD-UI-1 | D1 | ui | Local web build in firebase mode on localhost with a Firebase **test number** | code sent (no real SMS), verify signs in, lands on the right home; axe clean | ⬜ |
| TC-LD-SRV-1 | D8 | manual | After deploy: `pm2 ls`, `curl` live app health, `curl https://demo.champn.in/api/health` | live app processes unchanged (same pids/uptime), demo healthy | ⬜ |
| TC-LD-SRV-2 | D8/D6 | manual | From outside: port 4100 | not reachable | ⬜ |
| TC-LD-E2E-1 | D1 | manual | Owner signs in on demo.champn.in with a real SMS (super-admin) | platform screens; sample customers visible | ⬜ |
| TC-LD-E2E-2 | D2/D9 | manual | Install APK; sign in with real SMS | signed in; volunteer/admin flows work | ⬜ |
| TC-LD-E2E-3 | D10 | manual | iPhone Safari on demo.champn.in | sign-in works; screens usable | ⬜ |
