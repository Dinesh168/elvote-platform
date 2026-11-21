# Usability round 2 (REQ B1, R1, H1–H2, U1–U4, J1–J3, A1–A2, S1–S2) · status: built (2026-11-21)

Owner (2026-11-21), summarised: join team should also scan the team code with the camera and needs a Back option; an admin request for a state with 300+ assemblies must be manageable; adding a banner on the phone says "no connection to server"; one account is either admin or volunteer, never both; give the admin a surname list with counts; the bottom menu looks half hidden; the super-admin should be able to do what an admin does (approve volunteers); sign out must confirm with a pop-up (not a double tap) and warn when data is not synced, also on delete; every screen needs a Back button (not only swipe) and the main button at the bottom; number keyboards need Done; polling-day serial number needs a clear option; page tops look empty and the Synced pill always covers the header: use one neat header like Polling day for Home, Voters, Me and admin pages. Designs approved: https://claude.ai/artifact/9ejYamEuznPrwstB8Jy43v (section "Round 2 · usability", 15 screens).

## Decisions (confirmed)
| # | Decision |
|---|---|
| D1 | One account = one role (admin **or** volunteer). An admin may still have several assemblies. The super-admin is separate. |
| D2 | Polling day: the serial number clears by itself after **Mark voted**. |
| D3 | Admin surnames: own page, opened from a row on the Dashboard. |
| D4 | Super-admin "Open a team as admin": full admin control, every action audit-logged under the super-admin. |
| D5 | Order: B1 → H + U → J → A + S; demo deployed after each step. |
| D6 | Bottom menu: verified on the APK; fixed if it is ours (Expo Go's own tools button is not). |

## Requirements

### B1 Uploads from the phone app
- Expo SDK 58 installs `expo/fetch` as the global `fetch`; it rejects React Native's `{ uri, name, type }` FormData parts, so every native upload failed before sending ("No connection to the server").
- All native uploads (admin banner, super-admin logo/photo/banner, voter-roll upload) attach the file as an `expo-file-system` `File` (a real Blob). One helper `appendFile(form, field, { uri, name, type })` for every upload.
- *Given* an admin on Android/iOS, *when* they save a banner, *then* it uploads and shows on Home.

### R1 One role per account
- Server: creating a volunteer join request is refused (`409 role_conflict`) when the user is an approved/pending **admin**; an admin access request is refused when the user is an approved/pending **volunteer**. Super-admin approval of a conflicting request is refused the same way.
- App: the register/choose-role and join screens explain the conflict ("You are a volunteer of JVP Rampur. Leave that team first to register as admin.") instead of sending.
- "Switch role" is no longer offered to normal users (the super-admin keeps Overview ⇄ team views).

### H1 One header style
- Volunteer Home, Voters, Me and admin Dashboard, More: a compact top bar (team logo 28 px + team name; right: status) and a large title below; pushed pages use the nav bar with Back (as Polling day).
- Home: summary card like Polling day (ring % met in the current booth, booth + Change, counts Today / Our / Target / Not met), then next voter.
- Admin Dashboard: the same card for the assembly (ring % met, counts Our / Target / Opp. / Not met), rows for Surnames, Booths, Volunteer requests (badge).

### H2 Quiet sync status
- No "Synced" pill. All sent → small cloud icon with a green tick. Waiting → amber pill "N to send". Offline → grey pill "Offline · N saved". Error → red pill "Not sent".
- Tapping it opens the Sync sheet: last sent time, items waiting, **Send now**.

### U1 Confirm sign out / delete
- Sign out and Delete account open a pop-up (Cancel / Sign out, destructive in red); no more "tap again".
- With unsent work the pop-up says how many items are not sent and offers **Send now** first. Signing out keeps unsent work on the phone for the same person. Delete with unsent work warns that the work will be lost.
- Every other "tap again to …" (remove banner, remove volunteer, etc.) uses the same pop-up.

### U2 Back and bottom buttons
- Every pushed screen shows a visible Back at the top left (not only swipe). Main action buttons sit at the bottom and stay above the keyboard.

### U3 Keyboard Done
- Every number/phone field: a keyboard bar with ↑ ↓ (previous/next field) and **Done** (iOS input accessory; Android `returnKeyType="done"` + the same bar). Tapping outside a field closes the keyboard.

### U4 Polling-day serial number
- ✕ inside the number box and a **Clear** key on the keypad; holding ⌫ clears; after Mark voted the number clears (D2).

### J1 Join team: scan or type
- Back button; **Scan team QR code** (camera, `expo-camera`) or type the 6-letter code. The QR holds `https://<host>/join/<CODE>`; opening that link in a browser/app also starts joining. Camera permission text in en/hi/pa.

### J2 Team read-only, pick booths
- After the code: party, state, assembly shown read-only (lock icon); the volunteer chooses booths (search, multi-select, all booths shown); **Send request · N booths** at the bottom.

### J3 Team QR code for admins
- Admin More → **Team QR code**: the QR, the code in large letters, Share.

### A1 Admin request with many assemblies
- After the state: segmented **Choose assemblies / Whole state (N)**; search by name or number; list grouped by district (or by number when districts are missing), tick boxes, A–Z index; selected chips (removable) and "N of M selected" + Continue at the bottom. Works with 300+ assemblies (virtualised list).

### A2 Admin surnames
- Dashboard → **Surnames**: each surname with voter count and a bar (% met / % our), search, zone and booth filters, sort (most voters / A–Z); tap → Voters filtered by that surname. Scoped to the admin's assembly.

### S1 Super-admin approvals
- Requests: tabs **Admins · N** / **Volunteers · N**; volunteer requests from every team (filters: team, state), Approve / Reject, oldest first.

### S2 Open a team as admin
- Super-admin can open any team in the admin app with full control; every write is audit-logged with the super-admin as actor; a banner "Viewing as super-admin" with Exit.

## Data / API changes
- `POST /v1/access-requests` and join: `409 role_conflict`.
- `GET /v1/admin/requests?kind=volunteer` (super-admin, all teams) + approve/reject; `GET /v1/m/:mid/surnames` (admin).
- Super-admin acting in a team: admin routes accept the super-admin (audit actor = super-admin).
- App: `expo-camera`, `expo-file-system` `File` uploads; `/join/[code]` route.

## Non-functional
- en/hi/pa for every new string; screens axe-clean; touch targets ≥ 44 px; lists virtualised (300+ assemblies, 1,000+ surnames).
- No voter data in logs; surname counts are aggregates.

## Out of scope
- Several roles per account; volunteer in several teams at once (unchanged).

## As built (differences from the text above)
- U1: with unsent work, sign out sends first ("Send and sign out"); without internet the person stays signed in. Unsent work is never handed to the next person who signs in on the phone.
- U3: the keyboard bar has Done only (no ↑ ↓); tapping outside a field closes the keyboard.
- U4: no separate Clear key (the keypad row is ⌫ 0 Voted); a 44 px ✕ Clear button and hold ⌫ clear the number.
- A2: rows show counts and % met / % our; they do not open a voter list (admins have no voter list).
- S2: "Open as admin" is kept in memory; reloading the app returns the super-admin to Overview.
