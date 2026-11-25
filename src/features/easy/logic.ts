/**
 * spec easy-redesign: list filters, sorts, house colours, shortcut counts (volunteer) and the admin numbers
 * (metric definitions, totals, who leads, Complete-data rows). Pure functions; screens only render.
 */
import type { GroupCode, Residence, Voter } from '@/api/types';
import { voterNames } from '@/features/session/localize';

// ---------- Volunteer: filters ----------
export type Grp = GroupCode | 'none';
export type AgeBand = 'a1' | 'a2' | 'a3' | 'a4';
export interface VoterFilters {
  grp?: Grp;
  mobile?: 'with' | 'without';
  age?: AgeBand;
  sex?: 'M' | 'F' | 'T';
  res?: Residence;
  help?: 'yes';
  voted?: 'yes' | 'no';
}
export type FilterKey = keyof VoterFilters;
export const FILTER_KEYS: FilterKey[] = ['grp', 'mobile', 'age', 'sex', 'res', 'help', 'voted'];

/** Age bands as the server counts them (stats_booth): first vote 18–20, young 18–34, middle 35–59, 60+. */
export const ageIn = (a: number, band: AgeBand) =>
  band === 'a1' ? a >= 18 && a <= 20 : band === 'a2' ? a >= 18 && a <= 34 : band === 'a3' ? a >= 35 && a <= 59 : a >= 60;

export function matchVoter(v: Voter, f: VoterFilters): boolean {
  if (f.grp && (f.grp === 'none' ? !!v.group : v.group !== f.grp)) return false;
  if (f.mobile === 'with' && !v.mobile) return false;
  if (f.mobile === 'without' && v.mobile) return false;
  if (f.age && !ageIn(v.age, f.age)) return false;
  if (f.sex && v.gender !== f.sex) return false;
  if (f.res && v.residence !== f.res) return false;
  if (f.help === 'yes' && !v.needsHelp) return false;
  if (f.voted === 'yes' && !v.votedAt) return false;
  if (f.voted === 'no' && v.votedAt) return false;
  return true;
}

export const activeKeys = (f: VoterFilters): FilterKey[] => FILTER_KEYS.filter((k) => f[k] !== undefined);
export function withoutKey(f: VoterFilters, k: FilterKey): VoterFilters {
  const n = { ...f };
  delete n[k];
  return n;
}
export function toggleFilter(f: VoterFilters, k: FilterKey, val: string): VoterFilters {
  return f[k] === val ? withoutKey(f, k) : ({ ...f, [k]: val } as VoterFilters);
}

/** Name (English or regional), relative, EPIC (3+ letters), serial number, house number. */
export function searchVoter(v: Voter, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  if (/^\d+$/.test(s)) return String(v.sno) === s || v.house.toLowerCase() === s;
  if (s.length >= 3 && v.epic.toLowerCase().includes(s)) return true;
  if (voterNames(v).some((n) => n.includes(s))) return true;
  return v.relative.toLowerCase().includes(s) || v.house.toLowerCase() === s;
}

export type VoterSort = 'sno' | 'name' | 'young' | 'old' | 'house';
export const VOTER_SORTS: VoterSort[] = ['sno', 'name', 'young', 'old', 'house'];
const houseKey = (h: string) => {
  const n = parseInt(h, 10);
  return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
};
export function sortVoters(list: Voter[], s: VoterSort): Voter[] {
  const out = [...list];
  if (s === 'name') out.sort((a, b) => a.name.localeCompare(b.name));
  else if (s === 'young') out.sort((a, b) => a.age - b.age || a.sno - b.sno);
  else if (s === 'old') out.sort((a, b) => b.age - a.age || a.sno - b.sno);
  else if (s === 'house') out.sort((a, b) => houseKey(a.house) - houseKey(b.house) || a.house.localeCompare(b.house) || a.sno - b.sno);
  else out.sort((a, b) => a.sno - b.sno);
  return out;
}

// ---------- Houses ----------
/** House colour (owner 2026-11-24): the group most people met in it belong to; a tie counts as Swing; nobody met = left. */
export type HouseColour = GroupCode | 'left';
export function houseColour(members: Voter[]): HouseColour {
  const c = { our: 0, target: 0, opp: 0 };
  let met = 0;
  for (const m of members) if (m.group) { c[m.group] += 1; met += 1; }
  if (!met) return 'left';
  if (c.our > c.target && c.our > c.opp) return 'our';
  if (c.opp > c.our && c.opp > c.target) return 'opp';
  return 'target';
}

export interface House { house: string; voters: Voter[]; size: number; met: number; colour: HouseColour; head: Voter }
export function houseList(voters: Voter[]): House[] {
  const by = new Map<string, Voter[]>();
  for (const v of voters) {
    const k = v.house || '—';
    const arr = by.get(k);
    if (arr) arr.push(v);
    else by.set(k, [v]);
  }
  return [...by.entries()]
    .map(([house, vs]) => {
      const members = [...vs].sort((a, b) => a.sno - b.sno);
      return { house, voters: members, size: members.length, met: members.filter((m) => m.group).length, colour: houseColour(members), head: members[0] };
    })
    .sort((a, b) => houseKey(a.house) - houseKey(b.house) || a.house.localeCompare(b.house));
}
export type HouseSort = 'house' | 'most' | 'left';
export function sortHouses(list: House[], s: HouseSort): House[] {
  const out = [...list];
  if (s === 'most') out.sort((a, b) => b.size - a.size);
  else if (s === 'left') out.sort((a, b) => b.size - b.met - (a.size - a.met));
  return out;
}

// ---------- Volunteer: shortcut numbers ----------
export type ShortcutKey =
  | 'all' | 'our' | 'target' | 'opp' | 'none' | 'withPhone' | 'noPhone' | 'ourWithPhone' | 'a1' | 'a2' | 'a3' | 'a4' | 'men' | 'women'
  | 'help' | 'moved' | 'died' | 'notFound' | 'houses' | 'ourHouses' | 'targetHouses' | 'oppHouses' | 'leftHouses';
/** The filter each voter shortcut opens (house shortcuts open the Houses list instead). */
export const SHORTCUT_FILTER: Partial<Record<ShortcutKey, VoterFilters>> = {
  all: {}, our: { grp: 'our' }, target: { grp: 'target' }, opp: { grp: 'opp' }, none: { grp: 'none' },
  withPhone: { mobile: 'with' }, noPhone: { mobile: 'without' }, ourWithPhone: { grp: 'our', mobile: 'with' },
  a1: { age: 'a1' }, a2: { age: 'a2' }, a3: { age: 'a3' }, a4: { age: 'a4' }, men: { sex: 'M' }, women: { sex: 'F' },
  help: { help: 'yes' }, moved: { res: 'moved' }, died: { res: 'died' }, notFound: { res: 'not_found' },
};
export const HOUSE_SHORTCUT: Partial<Record<ShortcutKey, HouseColour | 'all'>> = {
  houses: 'all', ourHouses: 'our', targetHouses: 'target', oppHouses: 'opp', leftHouses: 'left',
};
export function shortcutCounts(voters: Voter[]): Record<ShortcutKey, number> {
  const out = {} as Record<ShortcutKey, number>;
  for (const [k, f] of Object.entries(SHORTCUT_FILTER) as [ShortcutKey, VoterFilters][]) out[k] = voters.filter((v) => matchVoter(v, f)).length;
  const hs = houseList(voters);
  out.houses = hs.length;
  out.ourHouses = hs.filter((h) => h.colour === 'our').length;
  out.targetHouses = hs.filter((h) => h.colour === 'target').length;
  out.oppHouses = hs.filter((h) => h.colour === 'opp').length;
  out.leftHouses = hs.filter((h) => h.colour === 'left').length;
  return out;
}

// ---------- Admin numbers ----------
export interface BoothStatRow {
  no: number; name: string; area: string | null; zoneId: string | null; zone: string | null; lat: number | null; lng: number | null;
  total: number; met: number; our: number; target: number; opp: number; moved: number;
  withMobile: number; ourMobile: number; targetMobile: number; oppMobile: number;
  houses: number; housesVisited: number; housesWithMobile: number; ourHouses: number; targetHouses: number; oppHouses: number;
  firstTime: number; young: number; mid: number; senior: number; male: number; female: number; third: number; helpNeeded: number;
  voted: number; ourVoted: number; targetVoted: number; oppVoted: number; helpVoted: number; died: number; notFound: number;
  volunteers: number; metToday: number; lastMargin: number | null;
}
export type StatTotals = Omit<BoothStatRow, 'no' | 'name' | 'area' | 'zoneId' | 'zone' | 'lat' | 'lng' | 'lastMargin'> & { lastMargin: number; booths: number };

const NUM_KEYS = ['total', 'met', 'our', 'target', 'opp', 'moved', 'withMobile', 'ourMobile', 'targetMobile', 'oppMobile', 'houses', 'housesVisited',
  'housesWithMobile', 'ourHouses', 'targetHouses', 'oppHouses', 'firstTime', 'young', 'mid', 'senior', 'male', 'female', 'third', 'helpNeeded',
  'voted', 'ourVoted', 'targetVoted', 'oppVoted', 'helpVoted', 'died', 'notFound', 'volunteers', 'metToday'] as const;

export function sumStats(rows: BoothStatRow[]): StatTotals {
  const t = { booths: rows.length, lastMargin: 0 } as StatTotals;
  for (const k of NUM_KEYS) (t as Record<string, number>)[k] = 0;
  for (const r of rows) {
    for (const k of NUM_KEYS) (t as Record<string, number>)[k] += r[k] ?? 0;
    t.lastMargin += r.lastMargin ?? 0;
  }
  return t;
}

/** Who leads a booth: ours − opposition beyond 5 % of its voters; otherwise a close fight (shown as Swing colour). */
export function leadOf(r: Pick<BoothStatRow, 'our' | 'opp' | 'total'>): GroupCode {
  const d = r.our - r.opp;
  if (d > r.total * 0.05) return 'our';
  if (d < -r.total * 0.05) return 'opp';
  return 'target';
}

export type MetricGroup = 'poll' | 'voters' | 'houses' | 'phones' | 'age' | 'gender' | 'living' | 'team' | 'last';
export type MetricKind = 'voter' | 'house' | 'team' | 'pct' | 'last';
export interface Metric {
  key: string;
  group: MetricGroup;
  kind: MetricKind;
  icon: string;
  tone?: GroupCode | 'grey';
  /** Voter list filter this number opens (kind voter). */
  filter?: VoterFilters;
  value: (r: BoothStatRow | StatTotals) => number;
}
const m = (key: string, group: MetricGroup, kind: MetricKind, icon: string, value: Metric['value'], filter?: VoterFilters, tone?: Metric['tone']): Metric =>
  ({ key, group, kind, icon, value, filter, tone });
export const METRICS: Metric[] = [
  m('voted', 'poll', 'voter', 'checkbox', (r) => r.voted, { voted: 'yes' }),
  m('ourNotVoted', 'poll', 'voter', 'thumbs-up', (r) => r.our - r.ourVoted, { grp: 'our', voted: 'no' }, 'our'),
  m('targetNotVoted', 'poll', 'voter', 'swap-horizontal', (r) => r.target - r.targetVoted, { grp: 'target', voted: 'no' }, 'target'),
  m('oppNotVoted', 'poll', 'voter', 'thumbs-down', (r) => r.opp - r.oppVoted, { grp: 'opp', voted: 'no' }, 'opp'),
  m('helpNotVoted', 'poll', 'voter', 'accessibility', (r) => r.helpNeeded - r.helpVoted, { help: 'yes', voted: 'no' }),
  m('total', 'voters', 'voter', 'people', (r) => r.total, {}),
  m('our', 'voters', 'voter', 'thumbs-up', (r) => r.our, { grp: 'our' }, 'our'),
  m('target', 'voters', 'voter', 'swap-horizontal', (r) => r.target, { grp: 'target' }, 'target'),
  m('opp', 'voters', 'voter', 'thumbs-down', (r) => r.opp, { grp: 'opp' }, 'opp'),
  m('notMet', 'voters', 'voter', 'help-circle', (r) => r.total - r.met, { grp: 'none' }, 'grey'),
  m('metPct', 'voters', 'pct', 'checkmark-circle', (r) => (r.total ? Math.round((r.met / r.total) * 100) : 0)),
  m('houses', 'houses', 'house', 'home', (r) => r.houses),
  m('ourHouses', 'houses', 'house', 'home', (r) => r.ourHouses, undefined, 'our'),
  m('targetHouses', 'houses', 'house', 'home', (r) => r.targetHouses, undefined, 'target'),
  m('oppHouses', 'houses', 'house', 'home', (r) => r.oppHouses, undefined, 'opp'),
  m('leftHouses', 'houses', 'house', 'enter-outline', (r) => r.houses - r.housesVisited, undefined, 'grey'),
  m('withMobile', 'phones', 'voter', 'call', (r) => r.withMobile, { mobile: 'with' }),
  m('withoutMobile', 'phones', 'voter', 'call-outline', (r) => r.total - r.withMobile, { mobile: 'without' }, 'grey'),
  m('ourMobile', 'phones', 'voter', 'call', (r) => r.ourMobile, { grp: 'our', mobile: 'with' }, 'our'),
  // spec admin-fixes-r1 A6: Needs help to vote and Migrants sit with the voter groups.
  m('helpNeeded', 'voters', 'voter', 'accessibility', (r) => r.helpNeeded, { help: 'yes' }),
  m('moved', 'voters', 'voter', 'walk', (r) => r.moved, { res: 'moved' }, 'grey'),
  // spec admin-fixes-r1 A7: "People" split into Age wise and Gender wise.
  m('firstTime', 'age', 'voter', 'star', (r) => r.firstTime, { age: 'a1' }),
  m('young', 'age', 'voter', 'person', (r) => r.young, { age: 'a2' }),
  m('mid', 'age', 'voter', 'person', (r) => r.mid, { age: 'a3' }),
  m('senior', 'age', 'voter', 'person', (r) => r.senior, { age: 'a4' }),
  m('male', 'gender', 'voter', 'man', (r) => r.male, { sex: 'M' }),
  m('female', 'gender', 'voter', 'woman', (r) => r.female, { sex: 'F' }),
  m('third', 'gender', 'voter', 'person', (r) => r.third, { sex: 'T' }),
  m('died', 'living', 'voter', 'person-remove', (r) => r.died, { res: 'died' }, 'grey'),
  m('notFound', 'living', 'voter', 'help-buoy', (r) => r.notFound, { res: 'not_found' }, 'grey'),
  m('volunteers', 'team', 'team', 'people-circle', (r) => r.volunteers),
  m('metToday', 'team', 'team', 'today', (r) => r.metToday),
  m('lastMargin', 'last', 'last', 'trending-up', (r) => r.lastMargin ?? 0),
];
export const metricOf = (k: string) => METRICS.find((x) => x.key === k);
export const GROUP_ORDER: MetricGroup[] = ['poll', 'voters', 'houses', 'phones', 'age', 'gender', 'living', 'team', 'last'];
/** spec admin-fixes-r1 A8: the shortcut groups of the Dashboard and place pages (no Polling day group there). */
export const DASH_GROUPS: MetricGroup[] = GROUP_ORDER.filter((g) => g !== 'poll' && g !== 'last');

/** spec admin-fixes-r1 A10: Complete data opens with the first 10 booths of the place; at most 25 in one table. */
export const MATRIX_MAX = 25;
export const defaultMatrixBooths = (nos: number[]) => nos.slice(0, 10);

export type MatrixRow = { kind: 'group'; group: MetricGroup } | { kind: 'metric'; metric: Metric };
/** Complete-data rows: groups the admin hid are dropped; a search keeps the numbers whose name contains it. */
export function matrixRows(hidden: Partial<Record<MetricGroup, boolean>>, q: string, label: (k: string) => string = (k) => k, poll = true): MatrixRow[] {
  const s = q.trim().toLowerCase();
  const out: MatrixRow[] = [];
  for (const g of GROUP_ORDER) {
    if (hidden[g] || (g === 'poll' && !poll)) continue;
    const ms = METRICS.filter((x) => x.group === g && (!s || label(`em.m.${x.key}`).toLowerCase().includes(s)));
    if (!ms.length) continue;
    out.push({ kind: 'group', group: g });
    for (const metric of ms) out.push({ kind: 'metric', metric });
  }
  return out;
}

export type BoothSort = 'high' | 'low' | 'no';
export function sortBooths(rows: BoothStatRow[], metric: Metric, s: BoothSort): BoothStatRow[] {
  const out = [...rows];
  if (s === 'no') out.sort((a, b) => a.no - b.no);
  else if (s === 'low') out.sort((a, b) => metric.value(a) - metric.value(b) || a.no - b.no);
  else out.sort((a, b) => metric.value(b) - metric.value(a) || a.no - b.no);
  return out;
}

export interface BoothFilters { lead?: GroupCode; cov?: 'low' | 'high'; team?: 'none' | 'some' }
export function matchBooth(r: BoothStatRow, f: BoothFilters): boolean {
  if (f.lead && leadOf(r) !== f.lead) return false;
  const pct = r.total ? (r.met / r.total) * 100 : 0;
  if (f.cov === 'low' && pct >= 50) return false;
  if (f.cov === 'high' && pct < 50) return false;
  if (f.team === 'none' && r.metToday > 0) return false;
  if (f.team === 'some' && r.metToday === 0) return false;
  return true;
}

/** The last 14 days (oldest first) as YYYY-MM-DD, for the daily work charts. */
export function last14Days(now = Date.now()): string[] {
  return Array.from({ length: 14 }, (_, i) => new Date(now - (13 - i) * 86_400_000).toISOString().slice(0, 10));
}
