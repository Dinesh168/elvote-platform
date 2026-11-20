import type { GroupCode, Voter } from '@/api/types';

export interface BoothStats {
  total: number;
  met: number;
  notMet: number;
  our: number;
  target: number;
  opp: number;
  withMobile: number;
  withoutMobile: number;
  ourMobile: number;
  targetMobile: number;
  oppMobile: number;
  houses: number;
  ourHouses: number;
  targetHouses: number;
  oppHouses: number;
  ourHousesMobile: number;
  targetHousesMobile: number;
  oppHousesMobile: number;
  ageFirst: number; // 18–20
  ageYoung: number; // 21–35
  ageMid: number; // 36–60
  ageSenior: number; // 61+
  male: number;
  female: number;
  third: number;
  voted: number;
  needsHelpNotVoted: number;
}

const GROUPS: GroupCode[] = ['our', 'target', 'opp'];

/**
 * A house belongs to a group when that group has the most marked voters in it
 * (ties and houses with nobody marked belong to no group).
 */
export function houseGroup(members: Voter[]): GroupCode | undefined {
  const c = { our: 0, target: 0, opp: 0 };
  for (const m of members) if (m.group) c[m.group] += 1;
  const best = Math.max(c.our, c.target, c.opp);
  if (best === 0) return undefined;
  const winners = GROUPS.filter((g) => c[g] === best);
  return winners.length === 1 ? winners[0] : undefined;
}

export function selectBoothStats(all: Voter[], booth: number): BoothStats {
  const s: BoothStats = {
    total: 0, met: 0, notMet: 0, our: 0, target: 0, opp: 0,
    withMobile: 0, withoutMobile: 0, ourMobile: 0, targetMobile: 0, oppMobile: 0,
    houses: 0, ourHouses: 0, targetHouses: 0, oppHouses: 0, ourHousesMobile: 0, targetHousesMobile: 0, oppHousesMobile: 0,
    ageFirst: 0, ageYoung: 0, ageMid: 0, ageSenior: 0, male: 0, female: 0, third: 0, voted: 0, needsHelpNotVoted: 0,
  };
  const houses = new Map<string, Voter[]>();
  for (const v of all) {
    if (v.booth !== booth) continue;
    s.total += 1;
    if (v.group) {
      s.met += 1;
      s[v.group] += 1;
      if (v.mobile) s[`${v.group}Mobile` as const] += 1;
    }
    if (v.mobile) s.withMobile += 1;
    if (v.age <= 20) s.ageFirst += 1;
    else if (v.age <= 35) s.ageYoung += 1;
    else if (v.age <= 60) s.ageMid += 1;
    else s.ageSenior += 1;
    if (v.gender === 'M') s.male += 1;
    else if (v.gender === 'F') s.female += 1;
    else s.third += 1;
    if (v.votedAt) s.voted += 1;
    else if (v.needsHelp) s.needsHelpNotVoted += 1;
    const h = houses.get(v.house);
    if (h) h.push(v);
    else houses.set(v.house, [v]);
  }
  s.notMet = s.total - s.met;
  s.withoutMobile = s.total - s.withMobile;
  s.houses = houses.size;
  for (const members of houses.values()) {
    const g = houseGroup(members);
    if (!g) continue;
    s[`${g}Houses` as const] += 1;
    if (members.some((m) => m.mobile)) s[`${g}HousesMobile` as const] += 1;
  }
  return s;
}

/** Not-voted counts per group, for polling day. */
export function notVotedByGroup(all: Voter[], booth: number) {
  const r = { our: 0, target: 0, opp: 0, all: 0 };
  for (const v of all) {
    if (v.booth !== booth || v.votedAt) continue;
    r.all += 1;
    if (v.group) r[v.group] += 1;
  }
  return r;
}
