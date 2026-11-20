# Test cases: Backend v2

Spec: [`../specs/backend-v2.md`](../specs/backend-v2.md). Automated tests: `backend-v2/test/*.test.ts` (Vitest, real local PostgreSQL). Status: ☐ not run · ✅ pass · ❌ fail.

**Run 2026-11-19:** `npm test` in `backend-v2/` → 55/55 pass (5 files, real PostgreSQL 16.10 test databases); `tsc` clean. Web build against the local API: 19/19 browser checks (puppeteer, 390×844). Bugs found and fixed during the run: CORS blocked PUT/PATCH/DELETE; a web reload lost the current page; seed left a zone empty. Not done yet: load test (k6), Android emulator run, Firebase sign-in in the app.

| TC | REQ | Steps | Expected | Type | Status |
|---|---|---|---|---|---|
| TC-B1-1 | B1 | Run migrate on empty server | core + 2 state DBs with every table; partitions for seeded ACs | api | ✅ |
| TC-B1-2 | B1 | Run migrate again | No changes, no errors | api | ✅ |
| TC-B2-1 | B2 | Seed | Booth counts 25/20/12; voters per booth 800–1,300; 4 login numbers exist | api | ✅ |
| TC-B2-2 | B2 | Compare `stats_booth` with a raw recount | Equal for every booth | api | ✅ |
| TC-B3-1 | B3 | Verify 9000000003 + 123456 | 200 with tokens | api | ✅ |
| TC-B3-2 | B3 | Verify with 000000 | 401 `otp_invalid` | api | ✅ |
| TC-B3-3 | B3 | 5 wrong codes, then the right code | 5th → 429 `otp_locked`; right code still 429 while locked | api | ✅ |
| TC-B3-4 | B3 | Call /v1/me without token / with bad token | 401 | api | ✅ |
| TC-B3-5 | B3 | Refresh, then reuse the old refresh token | New tokens; old one → 401 | api | ✅ |
| TC-B4-1 | B4 | /v1/me as volunteer | role volunteer, booths [112, 113], not super-admin | api | ✅ |
| TC-B4-2 | B4 | Join with valid code | Pending membership; appears in admin pending list | api | ✅ |
| TC-B4-3 | B4 | Join with wrong code | 422 `code_invalid` | api | ✅ |
| TC-B5-1 | B5 | Volunteer reads booth 112 voters | ~1,000 rows with group/residence/voted fields | api | ✅ |
| TC-B5-2 | B5 | Volunteer reads booth 114 | 403 | api | ✅ |
| TC-B5-3 | B5 | Post a change twice with the same opId | One event, one state change | api | ✅ |
| TC-B5-4 | B5 | Party 1 marks voter Our; party 2 admin reads same voter | Party 2 sees no group | api | ✅ |
| TC-B5-5 | B5 | `since=` after a change | Only changed voters returned | api | ✅ |
| TC-B5-6 | B5 | Patch with bad mobile "123" | 422 | api | ✅ |
| TC-B6-1 | B6 | Dashboard for AC 66 | Totals equal raw recount; charts present; top 10 workers | api | ✅ |
| TC-B6-2 | B6 | Dashboard with zone filter | Equals sum of that zone's booths | api | ✅ |
| TC-B6-3 | B6 | Volunteer calls dashboard | 403 | api | ✅ |
| TC-B7-1 | B7 | Admin sets zone count above max | 422 | api | ✅ |
| TC-B7-2 | B7 | Admin lowers 10 → 8 | Z9, Z10 gone; their booths unassigned | api | ✅ |
| TC-B7-3 | B7 | Super-admin sets max 12; admin sets 12 | OK | api | ✅ |
| TC-B8-1 | B8 | Approve pending with booths | Status approved; booths saved; audit row | api | ✅ |
| TC-B8-2 | B8 | Reject with reason | Status rejected | api | ✅ |
| TC-B9-1 | B9 | Create drive "women", zones Z1 | Listed with targeted > 0, completed ≤ targeted | api | ✅ |
| TC-B10-1 | B10 | Poll summary | Voted equals poll_marks count; booths sorted lowest % first | api | ✅ |
| TC-B11-1 | B11 | Admin calls /v1/admin/parties | 403 | api | ✅ |
| TC-B11-2 | B11 | Super-admin adds another super-admin, then removes them | OK; removing the last one → 422 | api | ✅ |
| TC-B11-3 | B11 | Upload CSV roll for a new AC → confirm | Job done; voters + booths created; counters built | api | ✅ |
| TC-B11-4 | B11 | Upload CSV with 2 bad rows | Job shows 2 errors with row numbers | api | ✅ |
| TC-B11-5 | B11 | Clear party 1 AC 66 with wrong AC number | 422 | api | ✅ |
| TC-B11-6 | B11 | Clear party 1 AC 66 correctly | Party 1 contacts gone; roll and party 2 data intact; audit row | api | ✅ |
| TC-B12-1 | B12 | As `elvote_api`, query voter_contacts without app.party_id | 0 rows / error (RLS) | api | ✅ |
| TC-B12-2 | B12 | As `elvote_api`, TRUNCATE voters or read voter_sensitive | Permission denied | api | ✅ |
| TC-B12-3 | B12 | Send `booth=1 OR 1=1` | 422 (validation), no SQL error | api | ✅ |
| TC-B12-4 | B12 | Perf on seed: change write, booth voters, dashboard | < 100 ms, < 500 ms, < 300 ms (test asserts loose limits 500 / 1,500 / 800 ms on a dev PC) | api | ✅ |
| TC-B12-5 | B12 | Browser preflight for PUT from the app origin and from another origin | Allowed (GET, POST, PUT, PATCH, DELETE) / no allow-origin header | api | ✅ |
| TC-B-E2E | B5–B11 | Web build + API: volunteer saves a voter and it persists; admin dashboard, team, tasks, map, zones, polling day; super-admin overview and party AC page | 19 browser checks pass, no page errors | e2e | ✅ |
