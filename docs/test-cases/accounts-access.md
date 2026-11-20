# Test cases: accounts, registration and access (spec `docs/specs/accounts-access.md`)

Status: ⬜ not run · ✅ pass · ❌ fail. api = vitest (`backend-v2/test/98-access.test.ts`, Firebase verifier replaced by a test double); unit = Jest; ui = puppeteer; manual = real devices on staging.

| ID | Req | Type | Steps | Expected | Status |
|---|---|---|---|---|---|
| TC-AA-1 | AC1/AC3 | api | Firebase token, provider google.com, new uid + verified email | 200 tokens; `/v1/me` user.email set, mobile null, `profileDone` false | ✅ |
| TC-AA-2 | AC2 | api | provider password, email not verified | 403 `email_unverified` | ✅ |
| TC-AA-3 | AC14 | api | provider phone | 403 `provider_not_allowed` | ✅ |
| TC-AA-4 | AC3/AC12 | api | `promoteSuperAdmin({email})`, then Google sign-in with that email | same user id; super-admin; firebase uid linked | ✅ |
| TC-AA-5 | AC4 | api | PATCH profile: bad mobile; mobile of another user; valid | 422; 409 `mobile_taken`; 200 and `profileDone` true | ✅ |
| TC-AA-6 | AC4 | api | Admin request / join before profile is done | 422 `profile_required` | ✅ |
| TC-AA-7 | AC6 | api | Create admin request (new party name, PB, AC 66); second one; GET; withdraw | 200; 409 `request_open`; shows pending; withdrawn | ✅ |
| TC-AA-8 | AC7 | api | Non-super-admin lists / approves requests | 403 | ✅ |
| TC-AA-9 | AC7/AC8 | api | Super approves (party 1, PB, AC 66) | admin membership approved (source direct); `/v1/me` shows it; audit row | ✅ |
| TC-AA-10 | AC7 | api | Reject without reason; with reason | 422; rejected, `/v1/me` accessRequest shows reason | ✅ |
| TC-AA-11 | AC8 | api | Approve whole state PB for party 1 | memberships for AC 66 + AC 50 (source state); new party-1 PB customer created later → membership added | ✅ |
| TC-AA-12 | AC7 | api | Approve assemblies without a customer; with `createMissing` | 422 `no_customer`; customer created + membership | ✅ |
| TC-AA-13 | AC8 | api | Remove whole-state scope | state memberships removed; direct memberships kept | ✅ |
| TC-AA-14 | AC8 | api | Customer max_admins = current count, then whole-state grant | state admin still added (not counted) | ✅ |
| TC-AA-15 | AC10 | api | Super-admin lists a customer's pending volunteers; approves one with booths; rejects one | approved with booths; rejected with reason; admin token → 403 on these routes | ✅ |
| TC-AA-16 | AC9 | api | Admin with AC 66 + AC 50 → `/v1/me/overview` | 2 rows with volunteers, pending, contacted % | ✅ |
| TC-AA-17 | AC11 | api | Push sender captured: volunteer join; admin request; approve; reject; remove | admins / super-admins / the person get the right message in their language; web token sent as web push | ✅ |
| TC-AA-18 | AC11 | api | PUT push token with a web subscription (≈600 chars) | accepted; `GET /v1/push/vapid-key` returns the public key or 404 when unset | ✅ |
| TC-AA-19 | AC13 | api | Delete account with a Firebase token signed in 10 min ago; other uid; fresh | 422 `reauth_required`; 422 `reauth_mismatch`; 200 | ✅ |
| TC-AA-20 | AC12 | api | Seed with `--demo` | sample super-admin revoked (no sample logins) | ⬜ |
| TC-AA-U1 | AC1/AC2 | unit | Login (Firebase mode): Google button → adapter → `/v1/auth/firebase`; email sign-in; create account shows "check your email"; forgot password | adapter calls and messages as specified; no mobile/code fields | ✅ |
| TC-AA-U2 | AC2 | unit | Firebase error codes → messages | wrong password, no account, email in use, weak password, too many, network, pop-up closed | ✅ |
| TC-AA-U3 | AC4 | unit | Your details: name prefilled, mobile validation, `mobile_taken` message | as specified | ✅ |
| TC-AA-U4 | AC5/AC6 | unit | Register choice + admin request form validation (state, whole state vs assemblies) | as specified | ✅ |
| TC-AA-U5 | AC1 | unit | goLanding order: profile → super → approved → pending/request → register | correct route per case | ✅ |
| TC-AA-I18N | all | unit | en/hi/pa key parity | equal | ✅ |
| TC-AA-UI-1 | AC4–AC7/AC11 | ui | Local web (dev sign-in): new user → details → admin request → super-admin approves whole state → waiting screen moves into the app | flow completes; axe clean | ✅ |
| TC-AA-UI-2 | AC10 | ui | Volunteer joins with code → super-admin approves from customer page | volunteer lands on Home | ✅ |
| TC-AA-M1 | AC1 | manual | Staging website: Continue with Google (Chrome desktop, Android Chrome, iPhone Safari) | signed in | ⬜ |
| TC-AA-M2 | AC1 | manual | Android APK: Google account picker | signed in | ⬜ |
| TC-AA-M3 | AC11 | manual | Approval push arrives on Android (app closed) and on desktop Chrome (tab closed) | notification shown; tap opens the app | ⬜ |

**Run 2026-11-20:** backend vitest 158/158 (`98-access` 23 + `0-demo` 7 new); Jest 121/121; tsc + ESLint clean; puppeteer `aa-ui.js` 26/26 on the local website (new account → Your details → Admin request → super-admin approves whole state → the waiting screen opens the admin app by itself → All my assemblies; Requests page reject with reason; volunteer request approved from the customer page → volunteer lands on Home; Users → Admin access; axe clean on every new screen); demo build sign-in screen (Google + email, no mobile/test code) checked and axe clean.

Fixed while testing: choice chips (admin request form, approval sheet, join booths) had no `aria-checked`; after a whole-state approval the app could open a paused assembly first — it now prefers an active one (unit test added).

Not run yet (need the live demo / real devices): TC-AA-20 (seed `--demo` on the server), TC-AA-M1–M3 (real Google sign-in and push on phones and browsers). Firebase `elvote-max`: Google provider enabled 2026-11-20 (public name "ElVote").
