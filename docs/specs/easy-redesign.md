# Easy redesign (REQ O1–O5, V1–V6, A1–A8, S1–S2, B1–B4) · status: built (2026-11-25)

Owner (2026-11-24): "Our users are volunteers who are less educated and not tech savvy. They understand icons, images and
assisted navigation … give a single option … show where they came from … the voter card must stand out; colour the whole
card green for our voter … shortcuts to Total voters, Our voters … dropdowns for zone/area, booth, section, house … every
list needs search, filtering and sorting … Map and Trend separate … a reporting section with interactive reports and the
complete matrix of selected polling stations … EPIC must show … remove family head … location permission when the
volunteer opens Polling day … booth location is not set by volunteers … super-admin switches every feature on/off and
can restrict anybody … fix the Android menu icon and the bottom bar behind the system bar … build an APK."

Approved design: https://claude.ai/artifact/ByQFriznn47eEFH1QQt1U9 (volunteer app, admin app, super-admin panel).

Owner decisions: cards use a light tint of the group colour; "Our house" = most of the people met in it are ours; the word
**Swing** replaces Target everywhere; Poll day, voice help and every other feature are switched per team by the
super-admin; admins may still fix a missing booth location; caste and religion stay out (DPDP sensitive data).

## Users & entry points
| Who | Where |
|---|---|
| Volunteer (phone) | Tabs Home · Voters · Poll day (if on) · Me; ☰ side menu |
| Admin (phone, web) | Tabs Dashboard · Reports · Map · Poll day (if on) or Trend · Team; ☰ menu (Trend on poll day, Zones, Win plan, Team QR, Banner, Settings) |
| Super-admin (web, phone) | Platform → team page → Features and People |

## Requirements

### O1 Android fixes
- ☰ menu icon shows on Android (TeamBar). The bottom tab bar sits fully above the Android navigation bar (3-button and gesture).
- AC: *Given* an Android phone with 3-button navigation, *when* Home opens, *then* the ☰ icon is visible and every tab label is above the system buttons.

### O2 Navigation that never loses the user
- Every page below a tab root shows a "‹ Back to <page name>" button and a path line (e.g. Dashboard › Zone 2 › Booth 45). Each step of the path can be tapped.
- Opening a booth, zone, area, section, list or report pushes a new page with its own place in the route; the page it came from is unchanged when the user comes back (no filter left on the Dashboard).
- AC: *Given* the admin taps "Ours" on the Dashboard, *when* they press Back, *then* the Dashboard shows the same place and numbers as before.

### O3 Group colours and words
- Groups: Ours (green), Swing (amber), Opposition (red), Not met (white/grey), always colour + icon + word. "Target" is renamed "Swing" in en/hi/pa.

### O4 Feature switches (super-admin)
- Keys: existing map, poll, zones, tasks, slip, surnames, help, boothGps + new **voice, reports, trend, addPhone, residence, tips**.
- Each key also has "who gets it": everyone / admins only / volunteers only (default everyone). A switched-off feature disappears from the app (tab, button, menu row).
- AC: *Given* Poll day is off for a team, *then* no volunteer or admin of that team sees the Poll day tab; *given* voice is "volunteers only", *then* admins see no speaker button.

### O5 Person restrictions (super-admin)
- Pause a person in a team: they cannot use that team (next request answers 403 "paused"; the app shows "Your access is paused").
- Switch off single abilities per person: **mark voters**, **see phone numbers** (shown masked 98xxxxx210), **add phone numbers**, **polling day marks**. Enforced by the server, not only hidden.
- AC: *Given* "mark voters" is off for Jaswinder, *when* her phone sends a group change, *then* the server refuses it (403) and the app shows "Not allowed for you".

### V1 Voter card
- Whole card tinted in the group colour (white for not met), 12 px gaps between cards; the card being marked has a thick blue frame and a "Now marking" strip.
- Shows: S.No box, name, relative ("S/o …", "W/o …"), **EPIC**, gender · age · house, phone mark; pills First vote / Needs help to vote / Voted / Moved-Died-Not found; group badge with icon + word.
- Open card: three big buttons Ours / Swing / Opposition; then Call or Add phone, Slip on WhatsApp, Needs help to vote, Not here (Moved / Died / Not found). Each saves at once with Undo. Family head is not shown.

### V2 Volunteer Home
- Big button **Go to a house** (opens the Houses list); **Open last house: N** when there is one.
- Where bar: Booth ▾ (own booths only) · Section ▾ · House ▾; numbers follow it.
- Shortcut groups (icon + big number + word, each opens the list with that filter): Voters (All, Ours, Swing, Opposition, Not met), Houses (All, Ours, Swing, Opposition, Not visited), Phone numbers (With phone, No phone, Ours with phone), People (First vote 18–20, Young 18–34, Middle 35–59, 60+, Men, Women, Needs help to vote), Not living here (Moved, Died, Not found).
- Today ring (voters met today / 25) and streak stay.

### V3 Voters and Houses lists
- Toggle Voters | Houses. Search box (name, S.No, EPIC; houses: house number or family name). **Filter** sheet (group, phone, age, men/women, living, needs help) with counts and "Show N voters"; **Sort** sheet (serial, name, youngest, oldest, house). Active filters show as removable chips with "Clear all"; result count line.
- Voters grouped by section with a sticky section band. Houses list: house boxes tinted by the house colour (dashed white = not visited) with one square per member; tapping opens the **House page** (header + member cards + "Back to …").

### V4 Polling day (volunteer)
- Opening the Poll day tab asks for location first (screen with one big **Allow location** button) when the location check is on; after that a strip shows "You are at Booth 45 · 120 m" (or Away).
- Booth numbers: voted / total, ours voted; Not voted yet tiles Ours / Swing / Opposition / Needs help — tapping one shows that call list (search + sort) with Call buttons. Keypad + ✓ Voted stays.
- Volunteers cannot set or change a booth location.

### V5 Spoken help
- Speaker button on volunteer screens reads a short explanation of the screen in the app language (phone text-to-speech). Hidden when the `voice` feature is off.

### V6 Volunteer Me and menu
- Me: weekly bars, streak, rank, sync status, Language, Call my admin, Sign out. Side menu: Home, My page, Language, Picture tips (if on), Call my admin, Sign out.

### A1 Admin Dashboard
- Where bar: **Group by Zone | Area** switch (shown when the team may view by both) · Zone/Area ▾ · Booth ▾ · Section ▾.
- Goal card, "Needs you today", **donut** Voters by group (legend rows tappable), **14-day line** of voters met (opens Daily work), "All numbers in one table", the shortcut groups of V2 plus Team (Volunteers, Out today, Met today) and, on polling day, Polling day (Voted, Ours/Swing/Opposition not voted, Needs help not voted), age bars, **Booths here** list (search + sort, stacked bars).
- Tapping a number with no booth picked opens booths ranked by that number; with a booth picked opens the voter list with that filter.

### A2 Place page (booth / zone / area / section)
- `/admin/place?view=zone|area&key=…&booth=…&sec=…`: header (name, zone/area, who leads, 2022 result), everything of A1 for that place, plus for a booth: its sections and its volunteers (Call).

### A3 Booth list
- Booths ranked by a number with search, Filter (who leads, % met, nobody out today) and Sort (highest, lowest, booth number); stacked bar per booth; tap → place page.

### A4 Reports tab
- Summary donut + cards: **Complete data** (table: rows = every number grouped, columns = Total + each picked booth; booth picker with search and "All in <zone/area>"; group chips hide/show rows; every cell tappable; left column fixed while sliding), **Compare booths** (pick a number or "All groups" stacked; bars; sort; search), **Daily work** (14 bars; tap a day → met, became ours, phones added, top volunteers), **Volunteer work** (bars, search, sort), **People** (men/women donut, age bars), **Not living here** (per booth Moved / Died / Not found, tappable).

### A5 Admin Poll day
- Tab shown only when Poll day is on. Two views: **Voting** (donut voted/total, Ours voted %, Not voted yet tiles, voted by hour line, voted % by zone/area, booths with most of ours not voted) and **Booth attendance** (existing spec polling-day A2: tiles, alerts, volunteer list with search/sort, admins can fix a missing booth location).

### A6 Map and Trend stay separate pages
- Map: colour by Who leads / % met / 2022 result; booth card → place page. Trend: party chips, years, booths that moved (search + sort) → place page. Trend is a tab when Poll day is off, a menu row when it is on.

### A7 Team list
- Search, status chips (All / Out today / Slow / Quiet), Sort (most met today, least this week, name, booth); Call and Remind.

### A8 Charts
- Donut, line and bar charts use the validated chart colours (green #1B7F3B, amber #CA8A04, red #C8102E, grey); every chart also shows the numbers as text and every bar / legend row can be tapped.

### S1 Super-admin team features
- Team page → **Features**: grouped switches (Volunteer app, Admin app) with icon, one line, who-gets-it sheet; Poll day row shows date, hours and the at-the-booth distance.

### S2 Super-admin people
- Team page → **People**: search, chips All / Admins / Volunteers / Restricted; person page with **Can sign in** (pause) and ability switches (O5), booths, Remove from team (confirm).

### B1 Counters
- `stats_booth` adds `died`, `not_found`; recompute fills them. No other counter changes (ages keep 18–20, 18–34, 35–59, 60+).

### B2 Booth stats
- `GET /v1/m/:mid/booth-stats?view=zone|area&key=&booth=` → `{ booths: [{no, name, zone, area, lat, lng, …all counters}], totals }`, scoped to the admin's team; volunteers 403.
- `GET /v1/m/:mid/dashboard` accepts `area=` as well as `zone=`.

### B3 Feature who + new keys
- `party_constituencies.feature_who jsonb` `{key: 'all'|'admin'|'volunteer'}`; `/v1/me` sends each membership's **effective** features for its role.

### B4 Person restrictions
- `memberships.paused boolean`, `memberships.deny text[]` ⊆ {mark, phones, addPhone, poll}. Super-admin `PATCH /v1/admin/customers/:id/members/:mid` `{paused?, deny?}`. Field routes refuse denied writes (403 `not_allowed`); voter lists mask mobiles when `phones` is denied; paused memberships get 403 `paused`.

## Data / API changes
- Migrations: core/012_feature_who_restrictions.sql (feature_who, paused, deny); state/008_stats_residence.sql (died, not_found).
- Endpoints: B2, B4; dashboard `area`.
- App: new routes `/admin/place`, `/admin/booths`, `/admin/reports/*`, `/(tabs)/(voters)/house`; no new native module except `expo-speech` (V5) → new APK.

## Non-functional requirements
- Security: all new endpoints scoped by membership from the token; restrictions enforced server-side; super-admin only for S1/S2.
- Privacy: no caste/religion; masked phones for denied people; charts show counts only.
- Offline: volunteer screens read the device copy; filters/sorts are on-device; restrictions cached with `/v1/me`.
- Performance: lists virtualised (FlashList); booth-stats one query over `stats_booth` (≤ 400 booths).
- A11y: icon + word + colour; ≥ 48 dp targets; charts have text equivalents; 130 % font.
- i18n: en, hi, pa strings for every new label.

## Out of scope
- Caste / religion anything. Areas are still entered by the super-admin per booth (existing Booths page).

## Known gaps
- Spoken help depends on the phone's text-to-speech voices (Punjabi may fall back to Hindi or English).
