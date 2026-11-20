# Sync modes and offline safety (REQ S1–S9) · status: confirmed (2026-11-19)

Owner (2026-11-19): "online — change updates local DB as well as online; offline — only update local DB then sync to cloud later; semi — super admin sets a timer so every x minutes it tries to sync; if there is no internet, update local DB then sync once back. These are for volunteers as they travel to different places in the booth … handle all cases, no stop for the volunteer and no data loss."

## Decisions

| # | Decision |
|---|---|
| SD1 | Three modes per customer: **Live** (default), **Offline**, **Scheduled** |
| SD2 | **Only the super-admin** sets the mode and the timer (Customer settings → Sync). Admins and volunteers see it, can't change it |
| SD3 | Scheduled timer: any whole number of minutes, **1–120** (default 15) |
| SD4 | Conflict rule: the change made **later on the phone clock** wins; a "Voted" mark is never undone by an older change. Phone clocks more than 5 min in the future count as "now" |

## Requirements

### S1 Local database (all modes)
The volunteer's booths (voters, booths, tasks, branding) and the unsent-change queue are kept in durable storage on the device: SQLite on Android/iOS (`expo-sqlite/kv-store`), IndexedDB on the web. After a restart without internet the app opens with the last data and works fully (search, next voter, save, polling day, slip).

### S2 Saving
Every change is written to the local queue first (with its phone time `clientAt` and a unique `opId`), shown at once, and never removed until the server confirms it or it is moved to "Needs attention" (S5).

### S3 Modes
- **Live:** send right away; if offline, keep and send when the connection returns or the app comes to the front.
- **Offline:** never send automatically; send on **Sync now** (Me, status chip).
- **Scheduled:** try every N minutes while the app is open; also when the connection returns and when the app comes to the front if the last sync is older than N minutes.
The mode applies the moment the volunteer opens the app after the super-admin changes it (read from `/v1/me`; the last known mode is remembered offline).

### S4 Batch sync
`POST /v1/m/:mid/changes/batch` with up to 100 changes in order → a result per `opId`: `ok`, `duplicate` (already applied), or an error code. The app sends in chunks, in order, and stops on a network error (keeps the rest).

### S5 Errors never block the queue
Permanent errors for one change (voter not found, booth no longer assigned, feature off, invalid) move that change to **Needs attention** (kept on the phone, shown in Me with the voter and the reason; can be retried or dismissed by the volunteer). The rest of the queue continues.

### S6 Conflicts (SD4)
`voter_contacts.client_at` stores the phone time of the change it holds. An incoming change older than the stored one is kept in history (`contact_events`) but does not overwrite. A "Voted" undo older than the mark is ignored. `clientAt` in the future (> now + 5 min) is treated as now.

### S7 Sign-in and logout
- Sign-in expired while offline: changes stay; the app asks to sign in and then syncs.
- Logout, switch role, delete account: blocked while changes are unsent ("N changes not sent yet — Sync now"); never discarded.

### S8 Status
The status chip shows: *Synced · time* · *Saving…* · *Offline · N waiting* · *Next sync in N min* (Scheduled) · *Offline mode · N saved* (Offline) · *N need attention*. Tap → Sync now. Me shows mode, last sync, waiting count, Needs attention list.

### S9 Admin view
Team (volunteers) shows each volunteer's **last sync** time and **unsent** count reported at their last sync (no other activity is recorded).

## Non-functional
Sync of 1,000 queued changes completes in ≤ 30 s on 3G (10 batches). Local storage ≥ 10 booths × 1,500 voters. No change is ever lost by: app kill, restart, battery death, network drop mid-batch (idempotent `opId`), token expiry, logout, role switch, mode change.
