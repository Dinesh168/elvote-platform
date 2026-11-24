# Booth map: production map for admins (REQ M1–M7) · status: built (2026-11-23)

Owner (2026-11-23): "map is very basic and congested and slow - make it production level map"; "make sure it won't burn the
mobile after loading everything". Built as proposed: Leaflet in a WebView/iframe (no native SDK, works in Expo Go, APK, web);
keyless Esri street/satellite tiles for the demo (switch to a keyed provider, e.g. MapTiler, before going live); Results map
merged into Map (Trend "close losses" opens Map coloured by last result). Volunteer "My booths" map: not in this round.

## Requirements
- M1 Real map: street + satellite, pinch/zoom/pan, "show whole assembly", "my location".
- M2 Pins with booth numbers; clusters (count) when zoomed out; no overlapping labels; clusters neutral grey.
- M3 Colour by: % contacted · booth strength · last result (won 100+ / close / lost 100+ / none) · volunteers (has / none);
  legend with counts; zone filter chip; Map | List (list = lowest % first, the accessible table view).
- M4 Tap a booth → card: name, zone, met %, Our/Target/Opp, volunteers, first volunteer; Open · Call · Directions.
- M5 Search by booth number or name → zoom to it.
- M6 Booths without a location: chip → list → tap the map where the booth is → Save (admin `PUT …/booths/:no/location`).
- M7 Battery/speed: one request (`/v1/m/:mid/map`, cached 5 min); map page loads once; pins re-drawn only when data,
  colour mode or zone change; canvas renderer; clustering removes off-screen pins; tiles update only when idle; no polling.

## API
- `GET /v1/m/:mid/map` adds `workers`, `contact {name, mobile}` (first volunteer), `result` ('S'|'M'|'W'|null).

## Files
- `src/features/map/mapHtml.ts` (page), `MapView.native.tsx` (WebView), `MapView.tsx` (iframe), `src/app/admin/map.tsx`.
- Removed `src/app/admin/(more)/results-map.tsx`; side-menu row removed.
