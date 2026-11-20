# Test cases: sync modes and offline safety (spec `docs/specs/sync-modes.md`)

Status: ⬜ not run · ✅ pass · ❌ fail. api = vitest; unit = Jest; ui = puppeteer (web) with the network switched off.

| ID | Req | Type | Steps | Expected | Status |
|---|---|---|---|---|---|
| TC-S3-1 | SD2 | api | Super-admin sets `syncMode: scheduled, syncMinutes: 20`; volunteer `/v1/me` | membership `sync = {mode:'scheduled', minutes:20}`; 0 or 121 → 422 | ✅ |
| TC-S4-1 | S4 | api | Batch of 3 changes, then the same batch again | first: 3 × ok; second: 3 × duplicate; history has 3 events | ✅ |
| TC-S4-2 | S5 | api | Batch with a voter from another booth in the middle | that op `booth_forbidden`, the others ok | ✅ |
| TC-S6-1 | S6 | api | Change A (clientAt 10:05, group our) then older change B (clientAt 10:00, group opp) | stored group = our; history has both | ✅ |
| TC-S6-2 | S6 | api | Mark voted (clientAt 10:05) then undo with clientAt 10:00 | still voted | ✅ |
| TC-S6-3 | S6 | api | clientAt 2 days in the future | treated as now (a later real change still wins) | ✅ |
| TC-S9-1 | S9 | api | Batch with `unsent: 4` | admin team row shows lastSyncAt ≈ now, unsent 4 | ✅ |
| TC-S5-1 | S5 | unit | Outbox drain: op 2 of 3 returns booth_forbidden | ops 1 and 3 sent; op 2 in Needs attention; queue empty | ✅ |
| TC-S5-2 | S4 | unit | Network error on chunk 2 of 3 | chunk 1 removed; chunks 2–3 kept in order | ✅ |
| TC-S3-2 | S3 | unit | Scheduler: Offline never sends; Scheduled sends when due; Live sends on enqueue | as stated | ✅ |
| TC-S2-1 | S2 | unit | Change queued at 10:00, sent at 11:00 | `clientAt` sent = 10:00 | ✅ |
| TC-S7-1 | S7 | unit | Logout with 2 unsent changes | refused; changes kept | ✅ |
| TC-SU-1 | S1/S3 | ui | Volunteer: go offline, reload page, open Voters, mark 3 voters | voters load from the device; chip "Offline · 3 waiting"; back online → "Synced"; server has 3 changes | ✅ |
| TC-SU-2 | SD2 | ui | Super-admin Customer settings → Sync: Scheduled 1 min | volunteer chip "Next sync in …"; change sent within ~1 min | ✅ |
| TC-SU-3 | S8 | ui | Offline mode: mark a voter | chip "Offline mode · 1 saved"; nothing sent until Sync now | ✅ |

**Run 2026-11-19:** backend vitest 89/89 (`test/8-sync.test.ts` 9); Jest 81/81 (outbox batches + needs-attention, sync rules, phone time, logout guard); puppeteer `sync-ui.js` 9/9 with the API blocked to simulate no internet: the app reopens after a reload from the device copy, 3 changes wait on the phone and arrive after reconnecting (51 → 54), Offline mode holds changes until Sync now, Scheduled (1 min) sends on the timer; `web-desktop.js` 17/17.

Bugs found and fixed while testing: (1) the device copy was overwritten on start because screens asked for data before it finished loading → data is now loaded before any screen opens; (2) a 30-day in-memory keep time overflowed the browser/phone timer limit (~24.8 days) and threw the restored data away at once → keep time is now unlimited in memory, 30 days on the device; (3) data whose last refresh failed (offline) was not saved → anything holding data is saved; (4) the app could not open without internet → the profile is kept on the device; (5) a brief network drop during token refresh signed the person out → only a refusal by the server signs out; (6) the phone sent the upload time instead of the change time → each change keeps its own time; (7) one refused change blocked the whole queue → it moves to Needs attention.
