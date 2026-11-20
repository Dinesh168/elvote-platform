# Accounts, registration and access (REQ AC1–AC14) · status: built (2026-11-20)

Owner (2026-11-20): "Create it production level. For now avoid SMS. In registration take the phone number, compulsory — you decide where to collect the mobile. No need to verify the number by OTP for now. Everything else is needed except OTP login via phone number." Earlier the same day: "Admin can register with details and the super-admin needs to approve; volunteers the same — admin or super-admin approves"; "only the super-admin gives access / allocates the assembly to an admin; it can be one assembly or a whole state"; "I need notifications, not SMS".

## Decisions
| # | Decision |
|---|---|
| AD1 | Sign-in: **Continue with Google** (main) and **email + password** (for people without Google). Both through Firebase Authentication (project `elvote-max`). **No SMS / phone OTP sign-in.** Firebase handles passwords, email verification and password-reset emails |
| AD2 | **Mobile number is required** for every account and collected in a **"Your details" step right after the first sign-in** (before choosing Admin or Volunteer). It is **not verified** by SMS for now; the approver sees it before approving. Unique per account |
| AD3 | **Only the super-admin approves admins** and sets their access: **one assembly, several, or a whole state** (all of a party's assemblies in that state, including ones added later) |
| AD4 | **Volunteers** register with the team code (current flow) and are approved by **an admin of that assembly or the super-admin** |
| AD5 | People learn of requests and decisions by **phone push + browser push + the app's own status** (waiting screen checks every 30 s). No SMS, no email |
| AD6 | The super-admin account is created by an operator command with the owner's Google email; no hard-coded ids, no sample logins on servers |
| AD7 | Local development and automated tests keep the existing dev sign-in (mobile + 123456), which the server refuses in production |

## Users & entry points
- Everyone: `/login` → (first time) `/profile` "Your details" → `/register` "I am an Admin / a Volunteer" → admin request form or team code → `/waiting` → app.
- Super-admin: **Requests** page (`/platform/requests`): admin requests; customer page → volunteer requests; Users → admin access.
- Admin with several assemblies or a whole state: **State overview** (`/admin/overview`).

## Requirements

### AC1 Sign in with Google
- Website: Google pop-up (redirect fallback when pop-ups are blocked). Android app: native Google account picker. iPhone: the website in Safari (a future iOS app adds "Sign in with Apple", required by Apple).
- The app sends the Firebase ID token to `POST /v1/auth/firebase`; the server verifies it (Google keys, issuer/audience `elvote-max`), accepts providers `google.com` and `password`, and returns its own session tokens (30-day sign-in, unchanged).
- *Given* a person with a Google account, *when* they tap Continue with Google and pick the account, *then* they are signed in (first time → Your details).

### AC2 Email + password
- Tabs/links: Sign in · Create account · Forgot password. Create account: email + password (min 8) → Firebase sends a verification email; the app shows "Check your email, then tap I've verified". The server refuses unverified email accounts (`email_unverified`).
- Forgot password: Firebase sends a reset email.
- Errors in plain language (en/hi/pa): wrong password, no account, email already used (suggest Google / sign in), weak password, too many tries, no internet, pop-up closed.

### AC3 Account identity
- `users.firebase_uid` identifies the account; `users.email` (lower-case, unique) is stored from the token. The first sign-in with a verified email that matches an existing account without a Firebase id (for example the super-admin created by command) links to it.
- `users.mobile` becomes nullable (filled in AC4); unique when present.

### AC4 Your details (mobile collected here)
- Shown when the account has no name or no mobile, before anything else. Fields: full name (pre-filled from Google), mobile (+91, 10 digits starting 6–9), app language. `PATCH /v1/me/profile`.
- Mobile already used by another account → `mobile_taken`: "This mobile number is already used by another account. Sign in with that account, or ask your admin." The super-admin can change a user's mobile (Users page) to resolve mistakes.
- The mobile is shown to approvers and admins (tap to call) and in the super-admin Users list.

### AC5 Choose role
- `/register`: two large choices — **Volunteer** ("I have a team code from my admin") and **Admin** ("I manage a campaign for a party"). Super-admins never see this.

### AC6 Admin request
- Form: party (pick from the list or type a new name), state, area — **whole state** or **assemblies** (pick one or more), designation in the party, note (optional). `POST /v1/access-requests`. One open request per person; it can be withdrawn.
- `/waiting` shows "Admin request sent — waiting for approval" with the details.

### AC7 Super-admin decides admin requests
- `/platform/requests`: pending first, with name, mobile, email, party, state, area, designation, date. Approve opens a sheet: **party** (existing; or create the typed name), **state**, **area** (whole state, or assemblies), with a notice for assemblies that have no customer yet and an option **"Create customer settings for these assemblies"** (defaults; edit later). Reject needs a reason.
- `POST /v1/admin/access-requests/:id/approve` / `reject`. Audit logged.

### AC8 Admin access scopes
- Assemblies: one approved admin membership per assembly (existing model; customer `max_admins` limit applies).
- Whole state: `admin_scopes (user, party, state)`; the person gets an admin membership (`source = 'state'`) for every current customer of that party in that state, and **automatically for customers created later**. State-scope admins do not count against a customer's `max_admins`.
- Super-admin, Users → a user → **Admin access**: add assemblies / whole state, remove one, remove the whole-state scope (its memberships are removed; direct ones stay).
- Settings, features and limits stay per customer; only the super-admin changes them.

### AC9 State overview
- Admins with more than one assembly get **Overview** (`/admin/overview`, `GET /v1/me/overview`): per assembly — name, volunteers, pending requests, contacted % , polling-day attendance when active; tap opens that assembly. Grouped by state.

### AC10 Volunteer requests
- Volunteer flow unchanged (team code → name? (already from details) → booths → pending). The name now comes from Your details.
- Approve/reject by any approved admin of that assembly (including whole-state admins) — existing Team page — **or the super-admin**: customer page → **Volunteer requests** (`GET /v1/admin/customers/:id/requests`, `POST .../requests/:membershipId/approve|reject`).

### AC11 Notifications (no SMS)
| Event | Who | Text (en; hi/pa translated, in the receiver's language) | Opens |
|---|---|---|---|
| Volunteer requests to join | Approved admins of that assembly | "New volunteer request: {name}, booths {booths}" | Team |
| Admin request | All super-admins | "New admin request: {name} · {party} · {area}" | Requests |
| Approved (volunteer or admin) | The person | "You're approved: {party} · {area}" | Home |
| Not approved | The person | "Not approved: {reason}" | Waiting |
| Removed from a team / admin access removed | The person | "Your access to {party} · {area} was removed" | — |
- Phones: Expo push (existing). Website: standard Web Push (VAPID, service worker), Chrome/Edge/Firefox/Android; iPhone only from the Home Screen. The push permission is asked on the waiting screen ("Allow notifications so we can tell you when you're approved") and on admin screens.
- `/waiting` re-checks every 30 s and moves into the app when approved.
- Push is best-effort; failures are logged without personal data; dead tokens are deleted.

### AC12 Super-admin account
- `npm run admin:super -- --email owner@gmail.com [--mobile 98xxxxxxxx --name "..."]` creates or links the account and makes it a super-admin (idempotent). More super-admins: existing Super-admins page.
- Seeding sample data on a server creates **no logins** (sample users only exist in local/test).

### AC13 Account deletion re-check
- Deleting the account asks the person to **sign in again** (Google or password) instead of an SMS code; the server requires a fresh Firebase token (signed in within the last 5 minutes) for the same account.

### AC14 Production rules
- `AUTH_MODE=firebase` in production (dev mode refused — exists). Phone-provider tokens are refused (`provider_not_allowed`).
- Rate limits: sign-in 20/min per IP; requests 5/hour per user.
- Blocked users: as today (signed out with message).

## Data / API changes
- Core migration `006_accounts_access.sql`: `users.mobile` nullable; `users.email` (unique on lower(email)); `access_requests (id, user_id, kind 'admin', party_id NULL, party_name, state_code, whole_state, ac_nos smallint[], designation, note, status pending|approved|rejected|withdrawn, decided_by, decided_at, reason, created_at)` with one pending per user; `admin_scopes (user_id, party_id, state_code, granted_by, created_at, revoked_at)`; `memberships.source` ('direct' | 'state'); `push_tokens.token` long enough for web subscriptions.
- API: `PATCH /v1/me/profile`; `/v1/me` adds `user.email`, `user.profileDone`, `accessRequest`; `POST/GET/DELETE /v1/access-requests`; `GET /v1/admin/access-requests`, `POST .../:id/approve|reject`; `GET/POST/DELETE /v1/admin/users/:id/admin-access`; `GET /v1/admin/customers/:id/requests` + approve/reject; `GET /v1/me/overview`; `GET /v1/push/vapid-key`.
- App: `src/features/auth/firebaseAuth.ts` (web) / `.native.ts` (Android); screens `/profile`, `/register`, `/register-admin`, `/platform/requests`, `/admin/overview`; waiting, login, delete-account, Users and customer pages updated; `public/sw.js` for web push.
- Removed from the app: phone OTP sign-in in Firebase mode (`phoneAuth*`).

## Non-functional
- **Security:** server-side token verification only; scopes enforced on the server from memberships (RLS unchanged); only super-admins decide admin requests/scopes; audit log for every decision and scope change; mobile/email never logged; VAPID private key only in the server env.
- **Privacy:** Firebase holds the email/Google id; mobile stays in our DB; push texts contain names/booth numbers only (no voter data).
- **Performance:** overview is one aggregate query per state DB; scope materialisation is set-based.
- **Offline:** sign-in/registration need internet; once approved the app works offline as before.
- **i18n / a11y:** all new text en/hi/pa; Google button meets contrast/size; screens axe-clean; 130 % font size.

## Known gaps
- Mobile not verified (by decision); a wrong/borrowed number is caught by the approver or fixed by the super-admin.
- Android Google sign-in needs the APK's SHA-1 in Firebase (after the first EAS build). iPhone app later (Sign in with Apple).
- Web push on iPhone only from the Home Screen.

## Out of scope
- SMS/OTP sign-in, mobile verification, email notifications, maps (separate phase), store release.
