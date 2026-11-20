import type { Voter } from '@/api/types';
import { evaluateEntry, pressKey } from './keypad';

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
  epic: 'PBX0000001',
  residence: 'here',
  needsHelp: false,
  ...o,
});

const bySno = new Map([
  [43, v(43, { name: 'Ramesh Kumar', group: 'target' })],
  [40, v(40, { name: 'Kuldeep Singh', votedAt: '2026-11-18T05:12:00Z' })],
]);

describe('pressKey (TC-V5-6)', () => {
  it('appends digits up to 4, deletes, ignores leading zero', () => {
    expect(pressKey('', '4')).toBe('4');
    expect(pressKey('4', '3')).toBe('43');
    expect(pressKey('1234', '5')).toBe('1234');
    expect(pressKey('43', 'back')).toBe('4');
    expect(pressKey('', '0')).toBe('');
  });
});

describe('evaluateEntry (TC-V5-1, 3, 4)', () => {
  it('idle when empty', () => {
    expect(evaluateEntry('', bySno).state).toBe('idle');
  });
  it('found shows the voter and allows ✓', () => {
    const e = evaluateEntry('43', bySno);
    expect(e).toMatchObject({ state: 'found', canMark: true });
    expect(e.voter?.name).toBe('Ramesh Kumar');
  });
  it('already voted warns and blocks ✓', () => {
    expect(evaluateEntry('40', bySno)).toMatchObject({ state: 'already', canMark: false });
  });
  it('unknown serial errors after 2 digits', () => {
    expect(evaluateEntry('9', bySno).state).toBe('typing');
    expect(evaluateEntry('9999', bySno)).toMatchObject({ state: 'missing', canMark: false });
  });
});
