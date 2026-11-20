import type { Voter } from '@/api/types';

export type Key = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'back';

export const MAX_DIGITS = 4;

export function pressKey(num: string, key: Key): string {
  if (key === 'back') return num.slice(0, -1);
  if (num.length >= MAX_DIGITS) return num;
  if (num === '' && key === '0') return num;
  return num + key;
}

export type EntryState = 'idle' | 'typing' | 'found' | 'already' | 'missing';

export interface Entry {
  state: EntryState;
  voter?: Voter;
  canMark: boolean;
}

/** Evaluates the typed serial number against the booth's voters (keyed by S.No). */
export function evaluateEntry(num: string, bySno: Map<number, Voter>): Entry {
  if (!num) return { state: 'idle', canMark: false };
  const voter = bySno.get(Number(num));
  if (!voter) return { state: num.length >= 2 ? 'missing' : 'typing', canMark: false };
  if (voter.votedAt) return { state: 'already', voter, canMark: false };
  return { state: 'found', voter, canMark: true };
}
