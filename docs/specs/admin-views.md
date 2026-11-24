# Admin views, all-booths page, one-card voter marking, polling-day search, super-admin team control
(REQ A1, A2, G1, G2, V1, P1, S1–S3) · status: built (2026-11-24)

Owner (2026-11-23/24): no zone row on top; tapping voter numbers shows all booths with an overview bar; volunteer marks a
voter fast on one card with dropdowns; polling day searches EPIC, name or S.No over the whole assembly and the volunteer
decides from a list; super-admin decides what the admin can view by (zones the admin arranges; area / village from the booth
table) and can add admins and volunteers directly. Defaults confirmed: tap any summary number → all booths; "Died" and
"Not found" added (no caste / religion / party leaning: DPDP sensitive data); first 50 search results.

## Requirements
- A1 Dashboard: zone chips removed; one "All zones ▾" button (sheet) next to the title.
- A2 `/admin/booths-all`: whole-assembly bar + legend; groups (by the allowed level) with bars, %, booth count; tap a group
  for its booths (bars), a booth for its dashboard. Opened from the summary card (title → all; a number → sorted by it).
- G1 `booths.area` (tehsil / ward); village = `booths.locality`. Super-admin edits both on Booths (`PATCH …/place`).
- G2 `party_constituencies.views` ⊆ {zone, area, village}, ≥ 1, default {zone}; sent in `/v1/me` memberships; super-admin
  ticks them on the team page.
- V1 Voter card: Our/Target/Opp buttons, Lives here dropdown (Lives here / Moved / Died / Not found), Needs help Yes/No,
  Mobile — all on the card; each saves at once.
- P1 Poll day "Find voter": one box. Digits → that S.No in every booth; letters+digits → EPIC; text → name (English or
  regional). First 50, each with booth, S.No, relative, age, voted; ✓ Voted per row (other booths: window rules of
  flow-fixes P2).
- S1–S3 Super-admin team page: admins and volunteers (approved) with × remove; tap a volunteer to change booths; "Add a
  person" (Volunteer with booths, or Admin) by mobile / email — approved at once, no request.

## Data / API (2 columns, 0 tables)
- state `booths.area text` + index (ac_no, area); `voter_contacts.residence` allows died / not_found (migration state/007).
- core `party_constituencies.views text[]` (migration core/010).
- `GET /v1/admin/customers/:id/members`, `POST /v1/admin/volunteers`, `PUT /v1/admin/customers/:id/members/:mid/booths`,
  `DELETE /v1/admin/customers/:id/members/:mid`, `PATCH /v1/admin/booths/:state/:ac/:no/place`; customers PATCH `views`;
  `GET /v1/m/:mid/polling/find?q=`; booth-table adds `area`, `village`.

## Tests
- backend-v2/test/98-access.test.ts TC-SA-1..7; test/9-polling.test.ts TC-PF-6, TC-V1-1. Server 212/212, app 140/140.
- Not yet seen on screen (browser extension was disconnected): A1, A2, V1, P1 sheet, super-admin team page.
