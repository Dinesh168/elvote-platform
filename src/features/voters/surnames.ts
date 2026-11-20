import type { Voter } from '@/api/types';

export interface SurnameRow {
  surname: string;
  count: number;
  our: number;
  target: number;
  opp: number;
  notMet: number;
}

/** Surname = last word of the name (V-LIST-4). Biggest families first, then A–Z. */
export function surnames(voters: Voter[], booth: number): SurnameRow[] {
  const map = new Map<string, SurnameRow>();
  for (const v of voters) {
    if (v.booth !== booth) continue;
    const parts = v.name.trim().split(/\s+/);
    const surname = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    const r = map.get(surname) ?? { surname, count: 0, our: 0, target: 0, opp: 0, notMet: 0 };
    r.count += 1;
    if (v.group) r[v.group] += 1;
    else r.notMet += 1;
    map.set(surname, r);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.surname.localeCompare(b.surname));
}
