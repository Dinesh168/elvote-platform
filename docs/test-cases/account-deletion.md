# Test cases: account deletion (spec `docs/specs/account-deletion.md`)

Status: ⬜ not run · ✅ pass · ❌ fail. api = vitest against test DBs; ui = puppeteer on the web build.

| ID | Req | Type | Steps | Expected | Status |
|---|---|---|---|---|---|
| TC-AD1-1 | AD1 | api | Volunteer calls `POST /v1/me/delete/code` | 200 `{sent:true, devCode}` | ✅ |
| TC-AD2-1 | AD2 | api | `POST /v1/me/delete` with `confirm:"delete"` | 400 `confirm_required` | ✅ |
| TC-AD2-2 | AD2 | api | Wrong code | 422 `otp_invalid`; account unchanged; app stays signed in | ✅ |
| TC-AD2-3 | AD2 | api | Only admin of an AC requests deletion | 409 `last_admin` listing the AC; nothing changed | ✅ |
| TC-AD2-4 | AD2 | api | Volunteer with right code + `DELETE` | 200 with `dueAt` ≈ now + 7 days; old refresh token → 401 | ✅ |
| TC-AD3-1 | AD3 | api | That volunteer signs in again | token response `deletionCancelled: true`; request cleared | ✅ |
| TC-AD4-1 | AD4 | api | Request, move `deletion_due_at` into the past, run erasure | user mobile/name/epic NULL/'' + status `deleted`; memberships `removed`; contact_events count unchanged; sessions gone | ✅ |
| TC-AD4-2 | AD4 | api | Same mobile signs in after erasure | a new user id, no memberships (goes to Join) | ✅ |
| TC-AD4-3 | AD4 | api | Admin dashboard top workers after erasure | the erased worker's name is empty (app shows "Deleted user") | ⬜ |
| TC-AD2-5 | AD2 | api | Admin of an AC that has a second admin | 200 (not blocked) | ✅ |
| TC-AD5-1 | AD5 | ui | Volunteer: Me → Delete account → type DELETE → Send code → 123456 → Delete | Signed out; sign-in page shows the date notice | ✅ |
| TC-AD5-2 | AD5 | ui | Admin 9000000002 (only admin of AC 66): More → Delete account → … | Blocked message naming AC 66 | ✅ |
| TC-AD5-3 | AD5 | unit | i18n en/pa key sets identical | pass | ✅ |

**Run 2026-11-19:** backend vitest 65/65 (9 in `test/6-account.test.ts`); UI puppeteer `ad-ui.js` 3/3 (volunteer delete + undo by signing in, admin blocked as only admin of AC 50 and AC 66). TC-AD4-3 is covered by code (`topWorkers` returns an empty name; the app shows "Deleted user") but has no automated test yet.
