/** Admin polling-day data (spec polling-day A1, A2): refreshed every 30 s while the window is open. */
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/adminApi';
import { useActiveMembership } from '@/stores/session';
import { inWindow } from './rules';

/** The admin's polling day and whether it is live; alerts are polled only when there is one. */
export function useAdminPolling() {
  const m = useActiveMembership();
  const mid = m?.role === 'admin' ? m.id : '';
  const day = m?.role === 'admin' ? (m.pollingDay ?? null) : null;
  const live = inWindow(day);
  const alerts = useQuery({
    queryKey: ['pdAlerts', mid],
    queryFn: () => adminApi.pollingAlerts(mid),
    enabled: !!mid && !!day,
    refetchInterval: live ? 30_000 : false,
  });
  return { mid, day, live, alerts, unseen: alerts.data?.unseen ?? 0 };
}
