# Admin and volunteer fixes, round 1  (REQ A1–A10, V1–V3, O1–O2, B1) · status: built (2026-11-25)

Owner (2026-11-25), checking the easy redesign on the demo: 14 points (search voter, zone setup not working, list of
zones/areas/booths, win plan not working, remove quiet volunteers and map from the menu, migrants + needs help in the
Voters group, same-address voters on the card, welcome banner at the top, Section → Locality, reports not opening,
dropdowns not scrolling, zone filter errors, "People" → Voters with age wise / gender wise, no Polling day group,
admin profile + sign out). All proposed defaults confirmed. A9 corrected by the owner: zones (made by the admin) and
areas (from the super-admin's data) are separate groupings; the Zone | Area switch decides which one dropdown shows.

## Root causes found (local reproduction, 2026-11-25)
- **Menu pages under "More" never open** (Win plan, Zones, Map & Trend, Polling-day votes, Settings, Banner, Team QR):
  the easy redesign hid the `(more)` tab with `href: null`, which makes every page in that stack unreachable (even by URL).
- **Reports hang:** "Complete data" draws every booth × ~45 numbers at once (≈ 9,000 tappable cells for 200 booths).
- **Lists in sheets don't scroll:** `Sheet` puts its rows in a plain view with no scroll and no height limit.
- **Zone picked → "Check the internet":** happens when the app talks to a server without `booth-stats` (the app's
  fallback labels zones by *name* and then sends the name where the server expects the zone id → 400). The fallback is
  fixed (zone ids from `/zones`), and errors now say what really happened (O2).

## Users & entry points
| Who | Where |
|---|---|
| Admin | ☰ menu: Dashboard, Search voter, Zones · areas · booths, Team, Tasks · Win plan, Trend, Surnames · Booth attendance, Polling day votes · Zone setup, Team QR, Banner, Changes, Settings · Sign out; name at the top → My profile |
| Volunteer | Home (banner at the top), voter card |

## Requirements

### A1 Search voter (admin)
- Menu row **Search voter** → `/admin/search`. Two ways, picked by a switch: **EPIC** (one box) or **Name** (name box,
  plus optional **Address** = house number or locality, plus optional **Age**).
- Results (max 50, "showing first 50" when more): name, relative, EPIC, age · gender, booth · house · locality, group colour.
  Tapping a result opens that booth's voter list filtered to that voter (card open), with Back to Search.
- AC: *Given* a known EPIC, *when* the admin searches it, *then* exactly that voter is shown. *Given* name "Ram" and
  house "12", *then* only voters whose name contains Ram **and** whose house is 12 are shown. Age 40 matches 38–42.
- Edge: name under 3 letters → "Type at least 3 letters"; nothing found → "No voter found"; offline → error with Retry.

### A2 Zone setup
- Menu row renamed **Zone setup**; it opens the Zones page (fixed with the More-stack fix) and Save works.
- AC: *Given* the admin opens Zone setup, splits into 3 zones and moves a booth, *then* the change shows on the Dashboard zone list.

### A3 Zones · areas · booths (admin)
- Menu row **Zones · areas · booths** opens the existing All-booths page, which now has a **Zones | Areas | Booths** switch
  (Areas shown only when the data has areas), search, and per row: name, booths, voters, % met. Tap → place page.
- AC: *Given* 10 zones, *when* Zones is picked, *then* 10 rows show with their booth count; tapping one opens that zone's page.

### A4 Menu clean-up
- Win plan opens (More-stack fix). Rows **Quiet volunteers** and **Map** are removed from the admin menu (Map stays a tab;
  quiet volunteers stay on the Dashboard "Needs you today" card).

### A5 Admin profile and Sign out
- Tapping the name block at the top of the menu opens **My profile** (`/admin/profile`): name, phone/e-mail, role, team,
  assembly, Language row, **Sign out** (asks first). A **Sign out** row is also at the bottom of the admin menu (asks first).
- AC: *Given* an admin, *when* they tap Sign out and confirm, *then* they land on the sign-in screen.

### A6 Voters group on the Dashboard / place pages / volunteer Home
- Voters group = All, Ours, Swing, Opposition, Not met, **Needs help to vote**, **Migrants** (moved away).
- "Not living here" group keeps Died and Not found.

### A7 Words and groups
- The word "People" is no longer used for voters: the group is split into **Age wise** (First vote 18–20, 18–34, 35–59, 60+)
  and **Gender wise** (Men, Women, Third gender on admin pages). Reports card "People" → "Voters by age and gender".

### A8 No Polling day group on the Dashboard
- The Polling day tile group is not shown on the Dashboard or place pages (Poll day tab and Complete data keep it).

### A9 Zone | Area switch
- The switch shows when the team may view by both **or** any booth has an area. Zone mode: one **Zone** dropdown (zones made
  by the admin). Area mode: one **Area** dropdown (areas from the super-admin's data). Then Booth.
- Picking a zone or area shows its numbers; no error. Older servers: zone ids come from `/zones`, so picking works there too.

### A10 Reports open and never hang
- Complete data opens with at most **10 booths** (the first 10 of the place); the picker allows up to **25**
  ("Up to 25 booths in one table"). Reports hub and every report open within 2 s on 400 booths.

### V1 Same address voters
- An open voter card shows **Same address voters (n)** when the voter has a house number and n ≥ 2; it opens the house
  page of that house (volunteer and admin). Not shown on the house page itself.

### V2 Welcome banner at the top of volunteer Home
- The team banner (photo) and the candidate welcome card are the first things on Home, above the where bar.

### V3 Section → Locality
- Every visible "Section" word becomes **Locality** (en), **मोहल्ला** (hi), **ਮੁਹੱਲਾ** (pa), admin and volunteer.

### O1 Lists in sheets scroll
- Every sheet (dropdowns, filters, sort, pickers) scrolls when its rows are taller than the screen; header and Done stay.
- AC: 30 zones / 400 booths: the last row can be reached and tapped (phone and web).

### O2 Honest error message
- A failed load says **"No internet"** only when there is no connection; a server refusal says "Could not load (server
  answered N)". Retry stays.

### B1 Structured voter search
- `GET /v1/m/:mid/search` also accepts `epic`, `name` (≥ 3, else 422), `address`, `age` (18–125, ±2). Admin: whole assembly;
  volunteer: own booths (unchanged). Bound parameters only. Limit 50 (+ `more: true` when there are more; response
  `{ items, more }` for the structured form, old `q` form unchanged). Masks phones when denied.

## Data / API changes
- No tables or migrations. `GET /v1/m/:mid/search` extended (B1). docs/API.md updated.

## Non-functional requirements
- Security: search scoped by the membership from the token; admin only sees own assembly; volunteer only own booths; SQL bound.
- Privacy: no caste/religion; search results show no phone numbers; nothing logged.
- Performance: search uses existing indexes (epic unique, name trigram, part/house); ≤ 50 rows. Complete data ≤ 25 columns.
- Offline: search needs the server (shows the error + Retry). Other changes work from the device copy as before.
- A11y: icon + word; 48 dp targets; sheets scroll with screen readers.
- i18n: en, hi, pa for every new label.

## Out of scope
- Editing name/phone on the admin profile. Search for volunteers (they keep the list search).

## Known gaps
- I could not reach the demo server from this PC to confirm which server version it runs (no SSH alias here).
