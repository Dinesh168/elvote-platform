# Test cases: App v2 frontend

Spec: [`../specs/app-v2-frontend.md`](../specs/app-v2-frontend.md) and [`../specs/app-v2.md`](../specs/app-v2.md). Status column: ☐ not run · ✅ pass · ❌ fail.

**Run 2026-11-19 (V4 + login, admin, super-admin screens):** Jest 61/61 (adds Surnames, Help list, task status and voter-slip logic incl. HTML escaping), `tsc` clean, ESLint 0 errors, web build compiles. TC-V4-1/7 logic tested; their screens, TC-V4-2/4/6/8/9 and a new browser run wait for the local database and API to be restarted (they were stopped for low memory). Earlier 19/19 browser run covered sign-in, volunteer save, admin and super-admin screens.

**Run 2026-11-18 (part 1: foundation + Home, Voters, Polling day):** Jest 53/53 pass (`npm test`), `tsc` clean, ESLint 0 errors. Web build checked in headless Chrome at 390×844 with 14 interaction checks (Home → Start meeting → voter open on screen → save Our → toast → next voter on screen → Undo; Polling day 4,3 → ✓ Voted → count +1 → "Already voted"; stats detail; no page errors). Android emulator run and CI workflow are still to do (TC-O1-2, TC-O4-2).

Types: **unit** (Jest, pure logic), **ui** (Jest + React Native Testing Library), **e2e** (Playwright web `e2e/web/`, Maestro `.maestro/`), **manual** (device run with screenshot).

## O1 Foundation · O5 Look

| TC | REQ | Steps | Expected | Type | Status |
|---|---|---|---|---|---|
| TC-O1-1 | O1 | Render `/dev/gallery` | Every kit component renders without error | ui | ☐ |
| TC-O1-2 | O1 | Open the app on Web and on the Android emulator | Gallery looks the same (screenshots) | manual | ☐ |
| TC-O1-3 | O1 | Set font scale 130% (Android settings) | No clipped text in kit components | manual | ☐ |
| TC-O5-1 | O5 | Scan `src/app` and `src/features` for hex colour literals | None found | unit | ✅ |
| TC-O5-2 | O5 | Read group tokens | Our `#1B7F3B`, Target `#B45309`, Opposition `#D70015`, plus tints | unit | ✅ |

## i18n

| TC | REQ | Steps | Expected | Type | Status |
|---|---|---|---|---|---|
| TC-I-1 | F4 | Compare key sets of `en.json` and `pa.json` | Identical; no empty values | unit | ✅ |
| TC-I-2 | F4 | `t('home.left', { count: 696 })` in en and pa | "696 voters still to meet" / Punjabi equivalent with 696 | unit | ✅ |
| TC-I-3 | F4 | Tap ਪੰ / A on Home | All visible text switches language without restart | ui | ✅ |

## O2 Mock data layer

| TC | REQ | Steps | Expected | Type | Status |
|---|---|---|---|---|---|
| TC-O2-1 | O2 | Generate the seed twice | Identical output (deterministic) | unit | ✅ |
| TC-O2-2 | O2 | Count voters per booth | 112 → 1,200; 113 → 1,054 | unit | ✅ |
| TC-O2-3 | O2 | `selectBoothStats(112)` | met = our + target + opp; notMet = total − met; with + without mobile = total; age buckets sum to total; male + female + third = total | unit | ✅ |
| TC-O2-4 | O2 | Voter fields | Every voter has sno (unique per booth, 1…N), name, relative with S/o, W/o or D/o, age 18–95, house, EPIC | unit | ✅ |
| TC-O2-5 | O2 | Houses | 2–6 voters per house; serial numbers run house by house | unit | ✅ |
| TC-O2-6 | O2 | Call `mockApi.getVoters(112)` with error mode on | Promise rejects; the UI shows the error state with Retry | unit + ui | ☐ |

## V-DASH-0 Next voter rule

| TC | REQ | Steps | Expected | Type | Status |
|---|---|---|---|---|---|
| TC-N-1 | V-DASH-0 | No task picked; a task has `lastWorkedAt` | That task is used | unit | ✅ |
| TC-N-2 | V-DASH-0 | No task picked, none worked on | The task with the nearest due date | unit | ✅ |
| TC-N-3 | V-DASH-0 | No tasks assigned | "All voters of booth" | unit | ✅ |
| TC-N-4 | V-DASH-0 | User picked a task | That task, even if another was worked on later | unit | ✅ |
| TC-N-5 | V-DASH-0 | Within the task and booth | First not-met voter by serial number, skipping "Moved" | unit | ✅ |
| TC-N-6 | V-DASH-0 | Picked task is complete | Falls back to rule 2/3 (next task) | unit | ✅ |
| TC-N-7 | V-DASH-0 | Change booth | Next voter comes from the new booth | unit | ✅ |

## V3 Voters

| TC | REQ | Steps | Expected | Type | Status |
|---|---|---|---|---|---|
| TC-V3-1 | V3 | Search "14" | Only voters of house 14 (exact house match) | unit | ✅ |
| TC-V3-2 | V3 | Search "sun" | Voters whose name contains "sun" (case-insensitive) | unit | ✅ |
| TC-V3-3 | V3 | Search "54" | Voters aged 54, plus house 54 if it exists | unit | ✅ |
| TC-V3-4 | V3 | Search part of an EPIC | That voter | unit | ✅ |
| TC-V3-5 | V3 | Chip "Not met" | Only voters without a group | unit | ✅ |
| TC-V3-6 | V3 | Open 44, tap Our | 44 = Our; next not-met voter after 44 in the current order opens; toast "Saved · Sunita Devi · Our" | unit + ui | ✅ |
| TC-V3-7 | V3 | Tap Undo on the toast | 44 back to its previous group; 44 open again | unit + ui | ✅ |
| TC-V3-8 | V3 | Last not-met voter saved | No card opens; toast still shown | unit | ✅ |
| TC-V3-9 | V3 | Enter mobile "98765" and save | Error "Enter 10 digits"; not saved | unit | ☐ |
| TC-V3-10 | V3 | Lives here → Moved | Saved; voter skipped by the next-voter rule | unit | ✅ |
| TC-V3-11 | V3 | Same address | List shows only that house; Back clears the filter first | ui | ☐ |
| TC-V3-12 | V3 | Scroll 1,200 rows on a mid-range Android | No dropped frames visible; FlashList in use | manual | ☐ |
| TC-V3-13 | V3 | Group buttons have role radio + label; selected shows ✓ | a11y props present | ui | ✅ |

## V2 Home

| TC | REQ | Steps | Expected | Type | Status |
|---|---|---|---|---|---|
| TC-V2-1 | V2 | Render Home for booth 112 | Voters met 504-style numbers equal `selectBoothStats(112)` | ui | ✅ |
| TC-V2-2 | V2 | Pick booth 113 in the sheet | Every number and the next voter change to booth 113 | ui | ☐ |
| TC-V2-3 | V2 | Tap "Mobile numbers" | Detail list with 5 rows and Back | ui | ✅ |
| TC-V2-4 | V2 | Tap the task picker and choose a task | Next voter follows TC-N-4 | ui | ☐ |
| TC-V2-5 | V2 | Every touchable | Has accessibilityRole and accessibilityLabel | ui | ☐ |

## O3 Offline

| TC | REQ | Steps | Expected | Type | Status |
|---|---|---|---|---|---|
| TC-O3-1 | O3 | Offline, mark 3 voters | Queue length 3; pill "Offline · 3 saved"; UI shows the new groups | unit + ui | ✅ |
| TC-O3-2 | O3 | Go online | Queue drains in order; pill "Synced" | unit | ✅ |
| TC-O3-3 | O3 | Restart the app with 2 queued writes | Queue restored from storage | unit | ✅ |
| TC-O3-4 | O3 | Change the same voter twice offline | Both writes sent in order; final state = last | unit | ✅ |
| TC-O3-5 | O3 | Undo while offline | The queued write is removed | unit | ✅ |

## V1 Onboarding

| TC | REQ | Steps | Expected | Type | Status |
|---|---|---|---|---|---|
| TC-V1-1 | V1 | Pick ਪੰਜਾਬੀ | Language saved; next screens in Punjabi | ui | ☐ |
| TC-V1-2 | V1 | Mobile "12345" | Continue disabled; hint "Enter 10 digits" | ui | ☐ |
| TC-V1-3 | V1 | OTP 123456 | Logged in → Join | unit + ui | ☐ |
| TC-V1-4 | V1 | OTP 000000 | "Wrong code. Try again." | ui | ☐ |
| TC-V1-5 | V1 | 5 wrong OTPs | Locked for 60 s | unit | ☐ |
| TC-V1-6 | V1 | Code RAMPUR24 + name | Waiting screen; second Refresh → Home | ui | ☐ |
| TC-V1-7 | V1 | Invalid code | "This code is not valid." | ui | ☐ |
| TC-V1-8 | V1 | Full flow on web | Language → Home | e2e | ☐ |

## V5 Polling day

| TC | REQ | Steps | Expected | Type | Status |
|---|---|---|---|---|---|
| TC-V5-1 | V5 | Type 4, 3 | Panel shows the voter's name, group and details | unit + ui | ✅ |
| TC-V5-2 | V5 | Tap ✓ Voted | Voted +1; that group's not-voted −1; panel clears; chip "✓ 43" with Undo | unit + ui | ✅ |
| TC-V5-3 | V5 | Type a voted S.No | Warning "Already voted at …"; ✓ disabled | unit | ✅ |
| TC-V5-4 | V5 | Type 9999 | "No voter with S.No 9999 in Booth 112"; ✓ disabled | unit | ✅ |
| TC-V5-5 | V5 | Undo on a chip | Voted −1; counts restored | unit | ✅ |
| TC-V5-6 | V5 | Fifth digit | Ignored (max 4 digits) | unit | ✅ |

## V4 Tasks, Surnames, Voter slip, Help list, Me

| TC | REQ | Steps | Expected | Type | Status |
|---|---|---|---|---|---|
| TC-V4-1 | V-TASK-1 | Open Tasks | Each task shows name, targeted vs completed, %, status (Not started / Ongoing / Completed), dates and days left; tabs All / Ongoing / Completed filter the list | unit + ui | ☐ |
| TC-V4-2 | V-TASK-1 | Tap a task | Voters opens filtered to that task with its next not-met voter open | e2e | ☐ |
| TC-V4-3 | V-LIST-4 | Surname list for booth 112 | Surnames (last word of the name) with voter count and Our / Target / Opposition / Not met counts, biggest first; counts add up to the booth total | unit | ✅ |
| TC-V4-4 | V-LIST-4 | Search "kau" in Surnames, tap "Kaur" | List narrows; Voters opens searching "Kaur" | ui + e2e | ☐ |
| TC-V4-5 | V-CARD-5 | Voter slip for a voter | Shows candidate, party, ballot no., booth, S.No, name, relative, age, gender, address, EPIC, polling date; HTML escapes names | unit | ✅ |
| TC-V4-6 | V-CARD-5 | Share slip | Android/iOS: PDF through the share sheet; web: print dialog; plus "Share as text" | manual | ☐ |
| TC-V4-7 | V-POLL-6 | Help list | Only voters with "needs help" who have not voted, grouped by house; tap Voted → leaves the list with Undo; empty state "Everyone has voted" | unit + ui | ☐ |
| TC-V4-8 | V-GEN-3 | Me | Initials, name, mobile, booths, language, sync status with Sync now, Set my booth location, switch role, log out with confirm, app version | ui + e2e | ☐ |
| TC-V4-9 | B4 | `GET /v1/m/:mid/branding` as a volunteer | Party name, candidate, ballot no., poll date of the current election | api | ☐ |

## A1 Admin · S Super-admin
Covered by `docs/test-cases/backend-v2.md` (API) and the browser run (TC-B-E2E).

## O4 Quality

| TC | REQ | Steps | Expected | Type | Status |
|---|---|---|---|---|---|
| TC-O4-1 | O4 | `npm run lint`, `npm run typecheck`, `npm test` | All pass | ci | ☐ |
| TC-O4-2 | O4 | Open a PR | GitHub Actions runs the three commands | ci | ☐ |
