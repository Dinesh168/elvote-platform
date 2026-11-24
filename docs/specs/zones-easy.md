# Easy zones (REQ Z1–Z4) · status: built (2026-11-24)
Owner: "zones create make it easy, looks complex". Confirmed defaults: auto-split in booth-number order; split replaces zones (warning).
- Z1 "Split into ___ zones" → `POST /v1/m/:mid/zones/split {count}`: equal zones in booth-number order; names kept; zone_count set.
- Z2 Zone list (name, booths, % met); Add zone (count + 1); rename; `DELETE /v1/m/:mid/zones/:id` (booths → no zone, others renumber).
- Z3 Open a zone → tick list of every booth (no., name, village, other zone shown), search, filter All / Ticked / No zone; Save moves.
- Z4 "Without a zone (n)" row → tick list with "Put ticked booths in ▾".
- `GET /zones` adds `allBooths` and per-zone total / met. Tests: backend-v2/test/99z-zones.test.ts (TC-ZE-1..3).
