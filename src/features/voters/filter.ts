import type { GroupCode, Voter } from '@/api/types';

export type Chip = 'all' | 'todo' | GroupCode;
export type View = 'house' | 'serial';

export const PRESETS = {
  withMobile: (v: Voter) => !!v.mobile,
  withoutMobile: (v: Voter) => !v.mobile,
  ourMobile: (v: Voter) => v.group === 'our' && !!v.mobile,
  targetMobile: (v: Voter) => v.group === 'target' && !!v.mobile,
  oppMobile: (v: Voter) => v.group === 'opp' && !!v.mobile,
  ageFirst: (v: Voter) => v.age <= 20,
  ageYoung: (v: Voter) => v.age >= 21 && v.age <= 35,
  ageMid: (v: Voter) => v.age >= 36 && v.age <= 60,
  ageSenior: (v: Voter) => v.age >= 61,
  male: (v: Voter) => v.gender === 'M',
  female: (v: Voter) => v.gender === 'F',
  third: (v: Voter) => v.gender === 'T',
  needsHelp: (v: Voter) => v.needsHelp && !v.votedAt,
  notVoted: (v: Voter) => !v.votedAt,
  ourNotVoted: (v: Voter) => v.group === 'our' && !v.votedAt,
  targetNotVoted: (v: Voter) => v.group === 'target' && !v.votedAt,
  oppNotVoted: (v: Voter) => v.group === 'opp' && !v.votedAt,
} as const;
export type Preset = keyof typeof PRESETS;
export const isPreset = (x: unknown): x is Preset => typeof x === 'string' && x in PRESETS;

export interface VoterFilter {
  booth: number;
  /** Filter passed from Home / Polling day numbers (shown as a removable chip). */
  preset?: Preset | null;
  q?: string;
  chip?: Chip;
  /** Same-address filter: overrides search and chips. */
  house?: string | null;
}

/**
 * Search rules (TC-V3-1..4): house number exact, name contains, EPIC contains, age exact.
 */
export function matchesQuery(v: Voter, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  if (v.house.toLowerCase() === s) return true;
  if (v.name.toLowerCase().includes(s)) return true;
  if (s.length >= 3 && v.epic.toLowerCase().includes(s)) return true;
  if (/^\d+$/.test(s) && v.age === Number(s)) return true;
  return false;
}

export function filterVoters(voters: Voter[], f: VoterFilter): Voter[] {
  return voters.filter((v) => {
    if (v.booth !== f.booth) return false;
    if (f.house) return v.house === f.house;
    if (f.preset && !PRESETS[f.preset](v)) return false;
    if (f.q && !matchesQuery(v, f.q)) return false;
    const chip = f.chip ?? 'all';
    if (chip === 'todo') return !v.group;
    if (chip !== 'all') return v.group === chip;
    return true;
  });
}

/** House view keeps roll order (already house by house); serial view sorts by S.No. */
export function orderVoters(list: Voter[], view: View): Voter[] {
  return view === 'serial' ? [...list].sort((a, b) => a.sno - b.sno) : list;
}

/** After saving `savedId`, which voter opens next: the next not-met, not-moved one, wrapping around. */
export function nextOpenAfter(ordered: Voter[], savedId: string): string | null {
  const i = ordered.findIndex((v) => v.id === savedId);
  const open = (v: Voter) => !v.group && v.residence !== 'moved' && v.id !== savedId;
  for (let k = 1; k <= ordered.length; k++) {
    const v = ordered[(i + k) % ordered.length];
    if (v && open(v)) return v.id;
  }
  return null;
}

/** Groups an ordered list into house sections (house view). */
export function byHouse(ordered: Voter[]) {
  const out: { house: string; voters: Voter[] }[] = [];
  for (const v of ordered) {
    const last = out[out.length - 1];
    if (last && last.house === v.house) last.voters.push(v);
    else out.push({ house: v.house, voters: [v] });
  }
  return out;
}
