import type { Voter } from '@/api/types';

export interface HelpHouse {
  house: string;
  voters: Voter[];
}

/** V-POLL-6: voters who need help to vote and have not voted yet, grouped by house in roll order. */
export function helpList(voters: Voter[], booth: number): HelpHouse[] {
  const out: HelpHouse[] = [];
  const byHouse = new Map<string, HelpHouse>();
  for (const v of [...voters].sort((a, b) => a.sno - b.sno)) {
    if (v.booth !== booth || !v.needsHelp || v.votedAt) continue;
    let h = byHouse.get(v.house);
    if (!h) {
      h = { house: v.house, voters: [] };
      byHouse.set(v.house, h);
      out.push(h);
    }
    h.voters.push(v);
  }
  return out;
}
