import type { Task } from '@/api/types';

export type TaskStatus = 'not_started' | 'ongoing' | 'completed';

/** D12: Not started · Ongoing · Completed from the task dates; days left until the due date. */
export function taskStatus(task: Task, today: string): { status: TaskStatus; daysLeft: number } {
  const status: TaskStatus = task.startDate && today < task.startDate ? 'not_started' : today > task.dueDate ? 'completed' : 'ongoing';
  const daysLeft = Math.max(0, Math.round((Date.parse(task.dueDate) - Date.parse(today)) / 86_400_000));
  return { status, daysLeft };
}
