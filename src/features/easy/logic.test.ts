/** TC-ER-U1 … TC-ER-U8 (docs/test-cases/easy-redesign.md). */
import type { Voter } from '@/api/types';
import {
  activeKeys, houseColour, houseList, leadOf, matchVoter, matrixRows, METRICS, searchVoter, shortcutCounts, sortVoters, sumStats, withoutKey,
  type BoothStatRow,
} from './logic';

const base: Voter = {
  id: '1', booth: 112, sno: 1, name: 'Gurpreet Singh', relation: 'S/o', relative: 'Harbans Singh', age: 52, gender: 'M',
  house: '10', ward: '1', village: 'Gandhi Nagar', epic: 'PBX2034517', residence: 'here', needsHelp: false,
};
const v = (o: Partial<Voter>): Voter => ({ ...base, ...o });
const list: Voter[] = [
  v({ id: '1', sno: 1, name: 'Gurpreet Singh', age: 52, group: 'our', mobile: '9876543210', house: '10' }),
  v({ id: '2', sno: 2, name: 'Harjeet Kaur', gender: 'F', age: 48, group: 'our', house: '10', epic: 'PBX2034554' }),
  v({ id: '3', sno: 3, name: 'Amandeep Singh', age: 24, group: 'opp', house: '10', epic: 'PBX2034591' }),
  v({ id: '4', sno: 4, name: 'Simran Kaur', gender: 'F', age: 19, house: '11', epic: 'PBX2034628' }),
  v({ id: '5', sno: 5, name: 'Rajinder Kumar', age: 61, group: 'target', house: '11', residence: 'moved', epic: 'PBX2034665' }),
  v({ id: '6', sno: 6, name: 'Sunita Rani', gender: 'F', age: 57, group: 'opp', house: '11', needsHelp: true, epic: 'PBX2034702' }),
  v({ id: '7', sno: 7, name: 'Kamla Devi', gender: 'F', age: 66, house: '12', residence: 'died', epic: 'PBX2034739' }),
];

describe('voter filters (V3)', () => {
  it('TC-ER-U1 each filter keeps only matching voters; empty keeps all', () => {
    const ids = (f: Parameters<typeof matchVoter>[1]) => list.filter((x) => matchVoter(x, f)).map((x) => x.id);
    expect(ids({})).toHaveLength(7);
    expect(ids({ grp: 'our' })).toEqual(['1', '2']);
    expect(ids({ grp: 'none' })).toEqual(['4', '7']);
    expect(ids({ mobile: 'with' })).toEqual(['1']);
    expect(ids({ mobile: 'without' })).toHaveLength(6);
    expect(ids({ age: 'a1' })).toEqual(['4']);
    expect(ids({ age: 'a4' })).toEqual(['5', '7']);
    expect(ids({ sex: 'F' })).toEqual(['2', '4', '6', '7']);
    expect(ids({ res: 'died' })).toEqual(['7']);
    expect(ids({ help: 'yes' })).toEqual(['6']);
    expect(ids({ grp: 'opp', sex: 'F' })).toEqual(['6']);
  });

  it('TC-ER-U2 sorts by serial, name, youngest, oldest, house', () => {
    const ids = (s: Parameters<typeof sortVoters>[1]) => sortVoters([...list].reverse(), s).map((x) => x.id);
    expect(ids('sno')).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    expect(ids('name')[0]).toBe('3'); // Amandeep
    expect(ids('young')[0]).toBe('4');
    expect(ids('old')[0]).toBe('7');
    expect(ids('house').slice(0, 3)).toEqual(['1', '2', '3']);
  });

  it('TC-ER-U3 search matches EPIC, name, serial and house number', () => {
    expect(list.filter((x) => searchVoter(x, 'PBX20345')).map((x) => x.id)).toEqual(['1', '2', '3']);
    expect(list.filter((x) => searchVoter(x, 'kaur')).map((x) => x.id)).toEqual(['2', '4']);
    expect(list.filter((x) => searchVoter(x, '12')).map((x) => x.id)).toEqual(['7']);
    expect(list.filter((x) => searchVoter(x, '6')).map((x) => x.id)).toContain('6');
    expect(list.filter((x) => searchVoter(x, '')).length).toBe(7);
  });
});

describe('houses (V2, V3)', () => {
  it('TC-ER-U4 house colour = most of the people met; tie = swing; nobody met = left', () => {
    expect(houseColour(list.filter((x) => x.house === '10'))).toBe('our');
    expect(houseColour([list[0], list[2]])).toBe('target');
    expect(houseColour(list.filter((x) => x.house === '12'))).toBe('left');
    const houses = houseList(list);
    expect(houses.map((h) => h.house)).toEqual(['10', '11', '12']);
    expect(houses[0]).toMatchObject({ met: 3, size: 3, colour: 'our' });
  });

  it('TC-ER-U5 shortcut counts equal the filtered lists', () => {
    const c = shortcutCounts(list);
    expect(c.all).toBe(7);
    expect(c.our).toBe(2);
    expect(c.target).toBe(1);
    expect(c.opp).toBe(2);
    expect(c.none).toBe(2);
    expect(c.withPhone).toBe(1);
    expect(c.ourWithPhone).toBe(1);
    expect(c.a1).toBe(1);
    expect(c.women).toBe(4);
    expect(c.help).toBe(1);
    expect(c.moved).toBe(1);
    expect(c.died).toBe(1);
    expect(c.houses).toBe(3);
    expect(c.ourHouses).toBe(1);
    expect(c.leftHouses).toBe(1);
  });
});

describe('admin numbers (A1, A4)', () => {
  const row = (no: number, o: Partial<BoothStatRow>): BoothStatRow => ({
    no, name: `Booth ${no}`, area: null, zoneId: null, zone: null, lat: null, lng: null,
    total: 1000, met: 500, our: 200, target: 100, opp: 200, moved: 5, withMobile: 300, ourMobile: 100, targetMobile: 0, oppMobile: 0,
    houses: 250, housesVisited: 120, housesWithMobile: 0, ourHouses: 60, targetHouses: 20, oppHouses: 40, firstTime: 50, young: 300, mid: 400,
    senior: 250, male: 510, female: 489, third: 1, helpNeeded: 3, voted: 0, ourVoted: 0, targetVoted: 0, oppVoted: 0, helpVoted: 0,
    died: 4, notFound: 2, volunteers: 2, metToday: 10, lastMargin: 40, ...o,
  });
  it('TC-ER-U6 totals add up; lead by 5 % of voters', () => {
    const t = sumStats([row(1, {}), row(2, { our: 400, opp: 100 })]);
    expect(t.total).toBe(2000);
    expect(t.our).toBe(600);
    expect(t.died).toBe(8);
    expect(leadOf(row(1, { our: 400, opp: 100 }))).toBe('our');
    expect(leadOf(row(1, { our: 200, opp: 230 }))).toBe('target');
    expect(leadOf(row(1, { our: 100, opp: 400 }))).toBe('opp');
  });

  it('TC-ER-U7 matrix rows: hidden groups dropped, search keeps matching rows', () => {
    const all = matrixRows({}, '');
    expect(all.filter((r) => r.kind === 'group').length).toBeGreaterThan(4);
    expect(all.some((r) => r.kind === 'metric' && r.metric.key === 'withMobile')).toBe(true);
    const noHouses = matrixRows({ houses: true }, '');
    expect(noHouses.some((r) => r.kind === 'metric' && r.metric.group === 'houses')).toBe(false);
    const phone = matrixRows({}, 'phone', (k) => (k === 'em.m.withMobile' ? 'With phone' : k === 'em.m.withoutMobile' ? 'No phone' : k));
    expect(phone.filter((r) => r.kind === 'metric').map((r) => r.kind === 'metric' && r.metric.key)).toEqual(['withMobile', 'withoutMobile']);
    expect(METRICS.find((m) => m.key === 'withoutMobile')!.value(row(1, {}))).toBe(700);
  });

  it('TC-ER-U8 active filter keys and removing one', () => {
    const f = { grp: 'our' as const, mobile: 'with' as const };
    expect(activeKeys(f)).toEqual(['grp', 'mobile']);
    expect(withoutKey(f, 'grp')).toEqual({ mobile: 'with' });
  });
});
