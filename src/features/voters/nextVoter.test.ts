import type { Task, Voter } from '@/api/types';
import { nextVoter, pickTask, taskProgress } from './nextVoter';

const v = (sno: number, o: Partial<Voter> = {}): Voter => ({
  id: `112-${sno}`,
  booth: 112,
  sno,
  name: `Voter ${sno}`,
  relation: 'S/o',
  relative: 'X',
  age: 30,
  gender: 'F',
  house: String(sno),
  ward: '3',
  village: 'Rampur',
  epic: `PBX${String(sno).padStart(7, '0')}`,
  residence: 'here',
  needsHelp: false,
  ...o,
});

const t = (id: string, o: Partial<Task> = {}): Task => ({
  id,
  name: id,
  booths: [112, 113],
  criteria: {},
  dueDate: '2026-11-30',
  ...o,
});

const NOW = '2026-11-18T10:00:00Z';

describe('pickTask (V-DASH-0)', () => {
  const voters = [v(1), v(2), v(3, { group: 'our' })];

  it('TC-N-1 uses the task last worked on', () => {
    const tasks = [t('a', { dueDate: '2026-11-20' }), t('b', { lastWorkedAt: '2026-11-17T09:00:00Z' })];
    expect(pickTask(tasks, voters, { booth: 112, now: NOW })?.id).toBe('b');
  });

  it('TC-N-2 falls back to the nearest due date', () => {
    const tasks = [t('a', { dueDate: '2026-11-29' }), t('b', { dueDate: '2026-11-21' })];
    expect(pickTask(tasks, voters, { booth: 112, now: NOW })?.id).toBe('b');
  });

  it('TC-N-3 returns null when no tasks (all voters of booth)', () => {
    expect(pickTask([], voters, { booth: 112, now: NOW })).toBeNull();
  });

  it('TC-N-4 respects the picked task', () => {
    const tasks = [t('a'), t('b', { lastWorkedAt: '2026-11-17T09:00:00Z' })];
    expect(pickTask(tasks, voters, { booth: 112, now: NOW, pickedId: 'a' })?.id).toBe('a');
  });

  it('TC-N-4b picking "all" means all voters', () => {
    expect(pickTask([t('a')], voters, { booth: 112, now: NOW, pickedId: 'all' })).toBeNull();
  });

  it('TC-N-6 skips a complete task', () => {
    const women = t('women', { criteria: { gender: 'F' }, lastWorkedAt: '2026-11-17T09:00:00Z' });
    const other = t('other', { dueDate: '2026-11-25' });
    const allMet = [v(1, { group: 'our' }), v(2, { group: 'opp', gender: 'M' }), v(3, { gender: 'M' })];
    expect(pickTask([women, other], allMet, { booth: 112, now: NOW, pickedId: 'women' })?.id).toBe('other');
  });
});

describe('nextVoter (TC-N-5, TC-N-7)', () => {
  it('returns the first not-met voter by serial, skipping moved', () => {
    const voters = [v(3), v(1, { group: 'our' }), v(2, { residence: 'moved' }), v(4)];
    expect(nextVoter(voters, 112, null)?.sno).toBe(3);
  });

  it('applies task criteria', () => {
    const voters = [v(1, { gender: 'M' }), v(2, { gender: 'F' })];
    expect(nextVoter(voters, 112, t('w', { criteria: { gender: 'F' } }))?.sno).toBe(2);
    const young = [v(1, { age: 40 }), v(2, { age: 19 })];
    expect(nextVoter(young, 112, t('f', { criteria: { ageMax: 20 } }))?.sno).toBe(2);
  });

  it('uses the selected booth', () => {
    const voters = [v(1), { ...v(1), id: '113-1', booth: 113, name: 'East' }];
    expect(nextVoter(voters, 113, null)?.name).toBe('East');
  });

  it('returns undefined when everyone is met', () => {
    expect(nextVoter([v(1, { group: 'our' })], 112, null)).toBeUndefined();
  });
});

describe('taskProgress', () => {
  it('counts matching voters and those met', () => {
    const voters = [v(1, { group: 'our' }), v(2), v(3, { gender: 'M' })];
    expect(taskProgress(voters, 112, t('w', { criteria: { gender: 'F' } }))).toEqual({ done: 1, of: 2 });
  });
});
