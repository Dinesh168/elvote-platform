import type { Voter } from '@/api/types';
import { filterVoters, nextOpenAfter, orderVoters } from './filter';

const v = (sno: number, o: Partial<Voter> = {}): Voter => ({
  id: `112-${sno}`,
  booth: 112,
  sno,
  name: `Voter ${sno}`,
  relation: 'S/o',
  relative: 'X',
  age: 30,
  gender: 'M',
  house: '1',
  ward: '3',
  village: 'Rampur',
  epic: `PBX${String(sno).padStart(7, '0')}`,
  residence: 'here',
  needsHelp: false,
  ...o,
});

const voters = [
  v(41, { name: 'Gurpreet Singh', house: '12-A', age: 34 }),
  v(43, { name: 'Ramesh Kumar', house: '14', age: 58, group: 'target' }),
  v(44, { name: 'Sunita Devi', house: '14', age: 54, epic: 'PBX0001144' }),
  v(45, { name: 'Anil Sharma', house: '15', age: 22, group: 'opp' }),
  v(46, { name: 'Manpreet Kaur', house: '54', age: 19 }),
  { ...v(8), id: '113-8', booth: 113, name: 'Darshan Singh', house: '14' },
];

const sno = (list: Voter[]) => list.map((x) => x.sno);

describe('filterVoters (TC-V3-1..5)', () => {
  it('house number is an exact match, booth-scoped', () => {
    expect(sno(filterVoters(voters, { booth: 112, q: '14' }))).toEqual([43, 44]);
  });
  it('name contains, case-insensitive', () => {
    expect(sno(filterVoters(voters, { booth: 112, q: 'SUN' }))).toEqual([44]);
  });
  it('a number matches age or house', () => {
    expect(sno(filterVoters(voters, { booth: 112, q: '54' }))).toEqual([44, 46]);
  });
  it('EPIC contains', () => {
    expect(sno(filterVoters(voters, { booth: 112, q: '1144' }))).toEqual([44]);
  });
  it('chips', () => {
    expect(sno(filterVoters(voters, { booth: 112, chip: 'todo' }))).toEqual([41, 44, 46]);
    expect(sno(filterVoters(voters, { booth: 112, chip: 'opp' }))).toEqual([45]);
  });
  it('presets from Home numbers combine with chips', () => {
    const withM = [v(1, { mobile: '9876543210', group: 'our' }), v(2, { group: 'our' }), v(3, { mobile: '9876543211' })];
    expect(sno(filterVoters(withM, { booth: 112, preset: 'ourMobile' }))).toEqual([1]);
    expect(sno(filterVoters(withM, { booth: 112, preset: 'withMobile', chip: 'todo' }))).toEqual([3]);
    expect(sno(filterVoters(voters, { booth: 112, preset: 'ageFirst' }))).toEqual([46]);
  });
  it('same-address filter beats search', () => {
    expect(sno(filterVoters(voters, { booth: 112, q: 'xyz', house: '14' }))).toEqual([43, 44]);
  });
});

describe('orderVoters', () => {
  it('serial order sorts by sno; house order keeps roll order', () => {
    const shuffled = [voters[3], voters[0], voters[2]];
    expect(sno(orderVoters(shuffled, 'serial'))).toEqual([41, 44, 45]);
    expect(sno(orderVoters(shuffled, 'house'))).toEqual([45, 41, 44]);
  });
});

describe('nextOpenAfter (TC-V3-6, TC-V3-8, TC-V3-10)', () => {
  const list = [v(1), v(2, { group: 'our' }), v(3), v(4, { residence: 'moved' }), v(5)];
  it('opens the next not-met voter after the saved one', () => {
    expect(nextOpenAfter(list, '112-1')).toBe('112-3');
  });
  it('skips moved voters and wraps around', () => {
    expect(nextOpenAfter(list, '112-3')).toBe('112-5');
    expect(nextOpenAfter(list, '112-5')).toBe('112-1');
  });
  it('returns null when nobody is left', () => {
    expect(nextOpenAfter([v(1)], '112-1')).toBeNull();
  });
});
