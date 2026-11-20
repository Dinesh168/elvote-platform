/**
 * Polling-day rules on the phone (spec docs/specs/polling-day.md V1, V2, PD4). Pure functions so they work offline and in a
 * background task. The server applies the same rules to what it receives (backend-v2/src/lib/presence.ts).
 */
export interface PollingDay { electionId: string; name: string; date: string; opensAt: string; closesAt: string; radiusM: number }
export interface BoothPoint { no: number; lat: number; lng: number }
export type LocalStatus = 'checking' | 'at_booth' | 'away' | 'no_booth_location';
export interface Local {
  status: LocalStatus; distanceM: number | null; partNo: number | null; overCount: number; overSince: number | null; readingAt: number | null;
  event: 'left' | 'returned' | null;
}

export const MAX_ACCURACY_M = 100;
export const AWAY_MIN_GAP_MS = 60_000;
const IST_OFFSET_MS = 330 * 60_000;

/** Metres between two points (haversine). */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** "2027-02-20" + "05:00" in India time → epoch ms. */
const istMs = (date: string, hhmm: string) => Date.parse(`${date}T${hhmm}:00Z`) - IST_OFFSET_MS;

/** V1: inside the polling-day window now (device clock, India time). */
export function inWindow(day: PollingDay | null | undefined, now = new Date()) {
  if (!day) return false;
  const t = now.getTime();
  return t >= istMs(day.date, day.opensAt) && t < istMs(day.date, day.closesAt);
}

/** When the window next opens or closes (ms), so the app re-checks exactly then; null when it is over. */
export function nextChange(day: PollingDay | null | undefined, now = new Date()) {
  if (!day) return null;
  const open = istMs(day.date, day.opensAt);
  const close = istMs(day.date, day.closesAt);
  const t = now.getTime();
  return t < open ? open : t < close ? close : null;
}

/** V2 + PD4: new status from the previous one and a reading. */
export function judge(prev: Local | null, rd: { lat: number; lng: number; accuracy: number | null; at: number }, booths: BoothPoint[], radiusM: number): Local {
  const base: Local = prev ? { ...prev, event: null } : { status: 'checking', distanceM: null, partNo: null, overCount: 0, overSince: null, readingAt: null, event: null };
  if ((rd.accuracy ?? Infinity) > MAX_ACCURACY_M || (prev?.readingAt != null && rd.at <= prev.readingAt)) return base;
  if (!booths.length) return { ...base, status: 'no_booth_location', distanceM: null, partNo: null, overCount: 0, overSince: null, readingAt: rd.at };
  let best = { no: booths[0].no, d: Infinity };
  for (const b of booths) {
    const d = distanceM(rd, b);
    if (d < best.d) best = { no: b.no, d };
  }
  const d = Math.round(best.d);
  const at = { distanceM: d, partNo: best.no, readingAt: rd.at };
  if (d <= radiusM) return { ...base, ...at, status: 'at_booth', overCount: 0, overSince: null, event: prev?.status === 'away' ? 'returned' : null };
  const overCount = base.overCount + 1;
  const overSince = base.overSince ?? rd.at;
  if (prev?.status === 'away') return { ...base, ...at, overCount, overSince, status: 'away' };
  if (overCount >= 2 && rd.at - overSince >= AWAY_MIN_GAP_MS) return { ...base, ...at, overCount, overSince, status: 'away', event: 'left' };
  return { ...base, ...at, overCount, overSince, status: prev?.status === 'at_booth' ? 'at_booth' : 'checking' };
}
