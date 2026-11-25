/**
 * spec easy-redesign O2/A1/A2: an admin page's place (whole assembly, a zone or area, a booth, a section) travels in
 * the route params, so every page keeps its own place and Back returns to the page exactly as it was.
 */
import { useQuery } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { createContext, useContext } from 'react';
import { adminApi, type BoothStats } from '@/api/adminApi';
import { ApiError } from '@/api/http';
import { useActiveMembership } from '@/stores/session';
import type { BoothStatRow } from '../logic';

export type GroupView = 'zone' | 'area';
export interface Scope { view: GroupView; key?: string; booth?: number; sec?: string }
export type ScopeParams = { view?: string; key?: string; booth?: string; sec?: string };

export function scopeFromParams(p: ScopeParams): Scope {
  const n = Number(p.booth);
  return { view: p.view === 'area' ? 'area' : 'zone', key: p.key || undefined, booth: Number.isInteger(n) && n > 0 ? n : undefined, sec: p.sec || undefined };
}
export function scopeParams(s: Scope): Record<string, string> {
  const o: Record<string, string> = { view: s.view };
  if (s.key) o.key = s.key;
  if (s.booth) o.booth = String(s.booth);
  if (s.sec) o.sec = s.sec;
  return o;
}

/** Booth rows of the team for a zone / area (the booth itself is picked from these on the phone). */
export function useBoothStats(s: Pick<Scope, 'view' | 'key'>) {
  const mid = useActiveMembership()?.id ?? '';
  const zone = s.view === 'zone' ? s.key : undefined;
  const area = s.view === 'area' ? s.key : undefined;
  return useQuery({
    queryKey: ['bstats', mid, zone ?? '', area ?? ''],
    queryFn: () => boothStatsOrTable(mid, zone, area),
    enabled: !!mid,
    refetchInterval: 60_000,
  });
}
/**
 * Older servers (before easy-redesign B2) have no booth-stats: fall back to the booth table (fewer numbers; the rest
 * show 0) so the app keeps working until the server is updated.
 */
async function boothStatsOrTable(mid: string, zone?: string, area?: string): Promise<BoothStats> {
  try {
    return await adminApi.boothStats(mid, { zone, area });
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 404) throw e;
    const rows = (await adminApi.boothTable(mid, zone)).filter((b) => !area || b.area === area);
    const zero = { moved: 0, ourMobile: 0, targetMobile: 0, oppMobile: 0, housesWithMobile: 0, ourHouses: 0, targetHouses: 0, oppHouses: 0, firstTime: 0, young: 0, mid: 0,
      senior: 0, male: 0, female: 0, third: 0, helpNeeded: 0, voted: 0, ourVoted: 0, targetVoted: 0, oppVoted: 0, helpVoted: 0, died: 0, notFound: 0, metToday: 0, lastMargin: null };
    return {
      booths: rows.map((b) => ({ ...zero, no: b.no, name: b.name, area: b.area ?? null, zoneId: b.zone, zone: b.zone, lat: null, lng: null, total: b.total, met: b.met,
        our: b.our, target: b.target, opp: b.opp, withMobile: b.withMobile, houses: b.houses, housesVisited: b.housesVisited, volunteers: b.workers })),
      days: [],
    };
  }
}

/** All booths of the assembly (zone and area names for the pickers). */
export const useAllBoothStats = () => useBoothStats({ view: 'zone' });

export function groupsOf(rows: BoothStatRow[], view: GroupView): { key: string; name: string; booths: number }[] {
  const m = new Map<string, { name: string; booths: number }>();
  for (const r of rows) {
    const key = view === 'zone' ? r.zoneId : r.area;
    const name = view === 'zone' ? r.zone : r.area;
    if (!key || !name) continue;
    const cur = m.get(key);
    if (cur) cur.booths += 1;
    else m.set(key, { name, booths: 1 });
  }
  return [...m.entries()].map(([key, x]) => ({ key, ...x })).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

export function scopeName(t: TFunction, s: Scope, all: BoothStatRow[]): string {
  if (s.booth) return s.sec ? t('easy.boothSec', { no: s.booth, sec: s.sec }) : t('easy.boothNo', { no: s.booth });
  if (s.key) {
    const g = groupsOf(all, s.view).find((x) => x.key === s.key);
    return g ? (s.view === 'area' ? t('easy.areaName', { name: g.name }) : g.name) : s.key;
  }
  return t('easy.wholeAc');
}

/** Each admin tab has its own page stack; pages push into the stack they are in. */
export interface AdminRoutes { place: string; booths: string; voters: string; house: string; matrix: string; daily: string }
export const DASH_ROUTES: AdminRoutes = { place: '/admin/place', booths: '/admin/booths', voters: '/admin/avoters', house: '/admin/ahouse', matrix: '/admin/d-matrix', daily: '/admin/d-daily' };
export const REPORT_ROUTES: AdminRoutes = { place: '/admin/r-place', booths: '/admin/r-booths', voters: '/admin/r-voters', house: '/admin/r-house', matrix: '/admin/r-matrix', daily: '/admin/r-daily' };
export const AdminRoutesCtx = createContext<AdminRoutes>(DASH_ROUTES);
export const useAdminRoutes = () => useContext(AdminRoutesCtx);
