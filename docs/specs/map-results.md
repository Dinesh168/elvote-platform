# Map by last election + team margin (REQ M1–M4, R1) · status: built (2026-11-24)

Owner (2026-11-24): dots red / green / orange by the previous election; zoomed out, a cluster shows what is inside it; tap →
last election, current volunteer + Call, Open → booth page with everything about the booth; super-admin defines the margin.
Defaults confirmed: cluster = votes added up inside it; margin in votes; per team; default 100.

- M1 Map opens coloured by Last result: green won by ≥ margin, orange within, red lost by > margin, grey no result.
- M2 Clusters (Last result mode): sum our votes and the main rival's votes of the booths inside; same rule; count shown.
- M3 Booth card: "2022 · AAP 44% vs INC 38% · won by 112", volunteer, Open / Call / Directions.
- M4 Booth page (Open): "Last election" block (same line) + volunteer with Call, above strength and the numbers.
- R1 `party_constituencies.result_margin` (10–2,000, default 100; migration core/011). Super-admin: customer → Polling-day tab →
  "Close-contest margin (votes)". Used by map colours, worked-out booth strength, trend groups and the win plan.
- API: `/v1/m/:mid/map` adds `last { year, party, ours, oursVotes, rival, rivalPct, rivalVotes, margin }`; `/v1/me` memberships and
  customers carry `resultMargin`.
- Tests: backend-v2/test/95b-strength.test.ts TC-MR-1/2; server 214/214; app 140/140. Not yet seen on screen (browser extension
  disconnected).
