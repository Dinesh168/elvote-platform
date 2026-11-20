/**
 * "Next voter to meet" rule (spec app-v2.md, V-DASH-0).
 * Task: picked → last worked on → nearest due date → none (all voters of the booth).
 * Voter: first not-met voter of that task in the booth, by serial number, skipping "Moved".
 */
import type { Task, Voter } from '@/api/types';

export const ALL_VOTERS = 'all';

export function matchesTask(v: Voter, task: Task | null): boolean {
  if (!task) return true;
  const c = task.criteria;
  if (c.gender && v.gender !== c.gender) return false;
  if (c.ageMin !== undefined && v.age < c.ageMin) return false;
  if (c.ageMax !== undefined && v.age > c.ageMax) return false;
  if (c.group && v.group !== c.group) return false;
  if (c.residence && v.residence !== c.residence) return false;
  return true;
}

const isOpen = (v: Voter) => !v.group && v.residence !== 'moved';

export function taskProgress(voters: Voter[], booth: number, task: Task | null) {
  let of = 0;
  let done = 0;
  for (const v of voters) {
    if (v.booth !== booth || !matchesTask(v, task)) continue;
    of += 1;
    if (v.group) done += 1;
  }
  return { done, of };
}

function isComplete(voters: Voter[], booth: number, task: Task) {
  return !voters.some((v) => v.booth === booth && matchesTask(v, task) && isOpen(v));
}

export function pickTask(
  tasks: Task[],
  voters: Voter[],
  opts: { booth: number; now: string; pickedId?: string | null },
): Task | null {
  if (opts.pickedId === ALL_VOTERS) return null;
  const open = tasks.filter((t) => t.booths.includes(opts.booth) && !isComplete(voters, opts.booth, t));
  const picked = open.find((t) => t.id === opts.pickedId);
  if (picked) return picked;
  const worked = open.filter((t) => t.lastWorkedAt).sort((a, b) => (b.lastWorkedAt! > a.lastWorkedAt! ? 1 : -1));
  if (worked.length) return worked[0];
  const byDue = [...open].sort((a, b) => (a.dueDate > b.dueDate ? 1 : a.dueDate < b.dueDate ? -1 : 0));
  return byDue[0] ?? null;
}

export function nextVoter(voters: Voter[], booth: number, task: Task | null): Voter | undefined {
  let best: Voter | undefined;
  for (const v of voters) {
    if (v.booth !== booth || !isOpen(v) || !matchesTask(v, task)) continue;
    if (!best || v.sno < best.sno) best = v;
  }
  return best;
}
