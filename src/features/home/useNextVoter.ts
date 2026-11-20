import { useMemo } from 'react';
import type { Task, Voter } from '@/api/types';
import { ALL_VOTERS, nextVoter, pickTask, taskProgress } from '@/features/voters/nextVoter';

export type Why = 'picked' | 'auto' | 'due' | 'all';

/** Next voter to meet + the task it comes from + why (spec V-DASH-0). */
export function useNextVoter(voters: Voter[] | undefined, tasks: Task[] | undefined, booth: number, pickedId: string | null) {
  return useMemo(() => {
    if (!voters || !tasks) return null;
    const task = pickTask(tasks, voters, { booth, now: new Date().toISOString(), pickedId });
    const voter = nextVoter(voters, booth, task);
    const why: Why = !task ? 'all' : task.id === pickedId ? 'picked' : task.lastWorkedAt ? 'auto' : 'due';
    const options = [
      ...tasks.filter((x) => x.booths.includes(booth)).map((x) => ({ id: x.id, task: x, progress: taskProgress(voters, booth, x) })),
      { id: ALL_VOTERS, task: null, progress: taskProgress(voters, booth, null) },
    ];
    return { task, voter, why, options };
  }, [voters, tasks, booth, pickedId]);
}
