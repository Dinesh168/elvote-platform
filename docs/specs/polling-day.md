# Polling day: location check and booth presence (REQ S1–S3, V1–V4, A1–A2, O1) · status: built (2026-11-20)

Owner (2026-11-20): "how does app know when is polling day — I will be having the lat long of booths and on polling day I want to get permission from volunteer to give access for app to get latlong, otherwise don't allow to use app, and if volunteer moves out of a specific range like 300 metres away from booths assigned to him then notify his admin and him as well. And I want a proper dedicated page showing who has given access for location, at booth and away from booth … maybe super admin can give polling day based on state and edit the data." Change: "300 m is not fixed, super admin can change."

## Decisions

| # | Decision |
|---|---|
| PD1 | Polling day is set **per state**, optionally limited to some assemblies (phases, by-elections) |
| PD2 | Polling-day window: **05:00–19:00 India time** by default; the super-admin can change it per election |
| PD3 | The app keeps checking in the **background** on phones (Android shows a notification "ElVote is checking your booth location"; the volunteer is asked for "Allow all the time"). The website checks only while the page is open |
| PD4 | **Away** only after **2 readings in a row** beyond the distance (≈3 min apart); readings less accurate than **100 m** are ignored |
| PD5 | Admin alerts: **left the booth area** (at once), **still away after 15 min**, **returned**, **location turned off**. "Not reporting" (nothing received for 10 min) shows on the page but sends **no** alert |
| PD6 | Admin alerts arrive **in the app** (alert list + badge) and as **phone push notifications** (Expo push; needs a phone build to verify) |
| PD7 | Words used: **At booth / Away** (not online/offline, which already means "no internet") |
| PD8 | A booth without a location shows **"Booth location missing"**, no alarm; listed for the super-admin; admins can fix it from their app |
| PD9 | The distance is **set per customer** by the super-admin: **50–2,000 m, default 300 m** |

## Built notes
- The admin page is called **Booth attendance** (the existing voter-turnout page is already "Polling day"). Sidebar item with an unread badge; on phones it is under More, and while polling day is live a strip above every admin screen ("Polling day is live · 2 away") opens it.
- Extra status **Checking**: location allowed, no usable reading yet (e.g. first reading far away, or poor accuracy).
- Volunteer Me shows the polling date beforehand and the live status/mode on the day.

## Users & entry points

| Who | Where |
|---|---|
| Super-admin (website) | Sidebar → **Polling days** (S1) · **Booth locations** (S2) · Customer settings → **Polling day** tab (S3) · Customer settings → **Open polling-day page** (A2) |
| Volunteer (phone) | Automatic: on polling day the app starts with the location screen (V1); banner + phone notification when away (V3); Me shows the polling-day status |
| Admin (phone + website) | Sidebar/More → **Polling day** (A2, with alert list and badge); push notifications (A1) |

## Requirements

### S1 Polling days per state
- The super-admin lists, adds, edits and cancels elections. Each election has state, kind (assembly / parliament / local / by-election), name, poll date, the assemblies it covers (**all** or a list), and the window (opens / closes, India time).
- Stored in the state database's existing `elections` table (`ac_nos smallint[]` NULL = all ACs; `opens_at`, `closes_at` time; status gains `cancelled`).
- Every member of a customer in that state (and that assembly, if a list is given) gets the **next not-yet-finished** election in `/v1/me` → `membership.pollingDay = { electionId, name, date, opensAt, closesAt, radiusM }` (or `null`). The phone remembers it, so polling day starts even without internet.
- Rules: date must not be in the past when created; closes after opens; at most one active election per AC per date (409 `election_clash`).
- *Given* Punjab = 2027-02-20, all ACs, *when* a Punjab volunteer opens the app, *then* `pollingDay.date = 2027-02-20`. *Given* an election for AC 66 only, *then* an AC 67 member gets `null`. *Given* it is cancelled, *then* nobody gets it.

### S2 Booth locations
- The super-admin opens **Booth locations**, picks a state and assembly, and sees every booth with its latitude, longitude and source (upload / GPS / edited). **Missing only** filter. A count "N of M booths have no location".
- Edit one booth (lat 6–38, lng 68–98, i.e. India). Bulk: choose or paste a CSV `part_no,lat,lng` → preview (valid rows, errors per line) → save. Unknown booths and out-of-range values are rejected per line; the others are saved.
- Admins can set a booth's location from the polling-day page (uses the existing booth-location endpoint; admins are not limited by the `boothGps` feature for this).
- *Given* booth 112 has no location, *when* the super-admin enters 30.95, 75.70, *then* the 300 m check uses it from the volunteer's next sync.

### S3 Booth distance
- Customer settings → **Polling day** tab: "Counts as at the booth within [300] m" (50–2,000; 422 otherwise). Shown to the super-admin only; delivered to phones with `/v1/me` (`pollingDay.radiusM`, and `membership.boothRadiusM`).
- Offline phones keep the last distance they received.
- *Given* JVP Rampur = 500 m, *then* a volunteer 400 m from the booth is **At booth**, and the admin's circles are 500 m.

### V1 Location is required on polling day
- Inside the window on the poll date (device clock, India time), the volunteer app shows **only** the location screen until location is on and allowed: title "Polling day: turn on location", why ("Your team sees that you are at your booth. Your location is used only today, during voting hours."), button **Allow location**. If the phone refused before, the button opens the phone's settings. Location services off → "Turn on location in your phone settings".
- Phones: foreground permission first, then background ("Allow all the time"). If only foreground is given, the app still opens, and the check runs while the app is open (status shows "Only while app is open").
- Outside the window and on other days nothing changes. Admins and the super-admin are never gated.
- The server does **not** refuse saved changes (no data loss, spec sync-modes); a volunteer who bypasses the screen shows as **Location off** to the admin.
- *When* the volunteer denies, *then* they stay on the location screen. *When* they allow, *then* the app opens normally and the first reading is sent.

### V2 Distance check
- The phone takes a reading every ~2 minutes or after moving 50 m (background task on phones, `watchPosition` on the web).
- Distance = metres to the **nearest booth assigned** to the volunteer that has a location (haversine). Within the customer distance → **At booth**; beyond → **Away** after 2 readings in a row (PD4). Readings with accuracy > 100 m are ignored (but still count as "alive").
- No assigned booth has a location → **Booth location missing** (PD8). No booths assigned → same as missing.
- The server re-computes the distance from the reported position and booth coordinates; the admin sees the server's result.

### V3 Volunteer warning
- On becoming Away: a local phone notification "You are 650 m from Booth 112. Please go back." (works offline) and a banner on top of every volunteer screen. On return: the banner goes away. Repeated at most every 15 minutes while away.
- Website: the banner only (plus the browser notification if allowed).

### V4 Works without signal
- Readings are judged on the phone. Only the **latest** reading is kept for sending (plus whether the volunteer left / returned in between), sent at once when online, regardless of sync mode (it is not voter data). Never blocks the volunteer.

### A1 Admin alerts
- Alerts (stored as status changes): `left` (at once), `still_away` (15 min after leaving, once per away spell, created by a server job every minute), `returned`, `location_off` (permission withdrawn or location services off, reported by the phone; also when the phone says "denied").
- Each alert: volunteer name, booth, distance, time. Admin page shows the list (newest first) with a **badge** of unseen ones in the sidebar/More; opening the list marks them seen (per admin).
- Push: each alert is also sent to every admin of that customer who has registered a push token (title "Suresh left Booth 112", body "650 m away · 10:42"). Sent through Expo's push service; content is limited to name, booth number and distance (no voter data). Failures are logged and dropped (no retry storm).

### A2 Polling-day page
- **Tiles:** Sharing location · At booth · Away · Not reporting · Location off · Booths with nobody at them (booths with a location and ≥1 assigned volunteer, where none of them is At booth).
- **Map:** booths drawn from coordinates (no map tiles, like the booth map) with a circle of the customer's distance; volunteers as dots coloured by status (with icon + label in the table; colour is never the only signal).
- **Table:** volunteer, mobile, booth(s), status, distance, last update ("3 min ago"), with filters (All / At booth / Away / Not reporting / Location off / Not shared yet) and search. Phone layout: list rows.
- Refreshes by itself every **30 s** while open. Shows the election name and date, and "Polling day starts 20 Feb, 5:00 am" when it isn't polling day yet (status values are then empty).
- Status meanings: **At booth**, **Away**, **Not reporting** (last report > 10 min ago), **Location off**, **Booth location missing**, **Not shared yet** (no report today).
- The super-admin sees the same page for any customer (`/platform/polling/<customer>`).

### O1 Privacy (DPDP)
- Consent text on the location screen (V1); location is collected only **inside the window**.
- Stored: per volunteer the **latest** position, accuracy, distance, status and times (`field_presence`), plus **status changes** (`presence_events`: left / still_away / returned / location_off / location_on). **No trail** of positions.
- Deleted **30 days after the poll date** by a server job. Erased with the account (spec account-deletion).
- Only the admins of that customer and the super-admin can see it. Never logged.

## Data / API changes

**State DB** `migrations/state/003_polling_day.sql`: `elections` + `ac_nos smallint[]`, `opens_at time DEFAULT '05:00'`, `closes_at time DEFAULT '19:00'`, `updated_at`; status check adds `cancelled`; `booths.location_source` adds `edited`.

**Core DB** `migrations/core/005_polling_day.sql`:
- `party_constituencies.booth_radius_m smallint NOT NULL DEFAULT 300 CHECK (50–2000)`
- `field_presence (membership_id PK, party_constituency_id, election_id, poll_date, permission, status, lat, lng, accuracy_m, distance_m, part_no, over_count, away_since, still_alerted, reported_at, updated_at)`
- `presence_events (id, party_constituency_id, membership_id, kind, part_no, distance_m, at)`
- `presence_seen (membership_id PK, seen_at)` (admin's "seen up to")
- `push_tokens (token PK, user_id, platform, updated_at)`

**API**
| Method | Path | Who |
|---|---|---|
| GET/POST | `/v1/admin/elections` | super-admin |
| PATCH | `/v1/admin/elections/:state/:id` (also `status: 'cancelled'`) | super-admin |
| GET | `/v1/admin/booths?state&ac&missing` | super-admin |
| PATCH | `/v1/admin/booths/:state/:ac/:no` `{lat,lng}` | super-admin |
| POST | `/v1/admin/booths/locations` `{state, ac, rows:[{no,lat,lng}], dryRun}` | super-admin |
| PATCH | `/v1/admin/customers/:id` + `boothRadiusM` | super-admin |
| GET | `/v1/admin/customers/:id/polling` | super-admin |
| POST | `/v1/m/:mid/presence` `{permission, lat?, lng?, accuracy?, at, background?}` | volunteer |
| GET | `/v1/m/:mid/polling` | admin |
| GET | `/v1/m/:mid/polling/alerts`, POST `/v1/m/:mid/polling/alerts/seen` | admin |
| PUT | `/v1/me/push-token` `{token, platform}` / DELETE on logout | any |

`/v1/me` memberships gain `pollingDay` and `boothRadiusM`.

## Non-functional requirements
- **Security:** volunteers report only for their own membership; admins see only their customer; super-admin routes behind the platform check. Bound SQL only.
- **Offline:** V4; the gate decision uses the remembered `pollingDay` and the device clock.
- **Performance:** one upsert per report (≈1 per 2 min per volunteer → 10k volunteers ≈ 85 req/s peak); the page query reads `field_presence` for one customer (index on `party_constituency_id`). The 15-minute job is one indexed UPDATE … RETURNING per minute.
- **Battery:** balanced accuracy, 2-min / 50-m interval; stops outside the window.
- **a11y:** status = text + icon + colour; tiles and table readable at 130% font; map has a text alternative (the table).
- **i18n:** all text in en + pa.

## Known gaps
- Background location and push need a native build (EAS / Android emulator) to verify; the web and the server are verified here.
- Google Play needs a background-location declaration and a short video before release.
- iOS can pause background updates when the phone is still for a long time; the page then shows **Not reporting**, never a false **Away**.

## Out of scope
- Map tiles (street map); trail/history of positions; SMS alerts; checking admins' locations.
