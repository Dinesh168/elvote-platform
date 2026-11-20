# Account deletion (REQ AD1–AD6) · status: confirmed (2026-11-19)

Owner request (2026-11-19): "admin and volunteer give option to delete their account also". Also required by Apple App Store (5.1.1(v)) and Google Play (account deletion policy).

## Owner decisions

| # | Decision |
|---|---|
| ADD1 | **Keep the work, remove the person.** Name, mobile, EPIC, sessions and team memberships are erased. Voter updates they made stay with the party and show as "Deleted user" |
| ADD2 | **Confirm + 7-day undo.** The user types `DELETE` and re-enters an SMS code. The account is locked at once (signed out everywhere) and erased after 7 days. Signing in again within 7 days cancels the deletion |
| ADD3 | **Last admin is blocked.** An admin who is the only approved admin of an AC can't delete until another admin exists (or the super-admin assigns one) |

## Requirements

### AD1 Re-verify
- `POST /v1/me/delete/code` sends a code to the signed-in user's own mobile (same rate limits as sign-in; dev mode returns `devCode`).
- **Acceptance:** returns `{ sent: true }`; the mobile is taken from the account, never from the request.

### AD2 Request deletion
- `POST /v1/me/delete` with `{ confirm: "DELETE", code }` (or `{ confirm, idToken }` in Firebase mode).
- Checks, in order: `confirm` is exactly `DELETE` (else 400 `confirm_required`); code valid for the account's mobile (else 422 `otp_invalid` — not 401, which would sign the app out; failures counted, lock after 5); not the last approved admin of any AC (else 409 `last_admin`, with the AC list).
- Effect: `users.deletion_requested_at = now()`, `deletion_due_at = now() + 7 days`; every session revoked; audit `account.delete_requested`.
- **Acceptance:** after success, the refresh token no longer works; the response has `dueAt`.

### AD3 Undo by signing in
- Signing in (OTP or Firebase) within 7 days clears the request; the token response has `deletionCancelled: true`, and the app shows "Your account deletion was cancelled".

### AD4 Erasure (after 7 days)
- The API worker runs every 10 minutes and, for each due user, in one transaction: memberships → `removed` and their booth links deleted; platform-admin rights revoked; sessions and OTP attempts deleted; drive assignments removed from every state DB; user row anonymised (`mobile`, `epic`, `firebase_uid` → NULL, `name` → '', `status` → `deleted`, `deleted_at` = now()). Audit `account.erased` (IDs only).
- Contact history, polling-day marks and counters are **not** changed (ADD1); names show as "Deleted user".
- The same mobile can later sign up again as a new, empty account.

### AD5 App (volunteer Me, admin More; phone and web)
- "Delete account" row (red) → Delete account page: what happens (3 bullets), field "Type DELETE", Send code → code field → **Delete my account** (red, disabled until both are valid).
- Last-admin error shows the ACs and "Make another team member admin first, or ask the super-admin".
- On success: local session and saved data cleared; the sign-in page shows "Your account will be deleted on {date}. Sign in before then to cancel."

### AD6 Docs
- `docs/specs/backend-v2.md` endpoints list; FEATURES.md.

## Non-functional
- No voter data is deleted. Only the API's existing DB role is used. All SQL parameterised. Error messages never reveal another user's details.
- Known limit: an access token already issued stays valid for up to 15 minutes after the request (all refresh tokens are revoked at once; the app signs out immediately).
