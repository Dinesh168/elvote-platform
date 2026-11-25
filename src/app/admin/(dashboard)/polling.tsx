import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/api/adminApi';
import { LargeTitle, Screen } from '@/design/components';
import { QueryState } from '@/features/common/QueryState';
import { useAdminPolling } from '@/features/pollingDay/adminHooks';
import { PollingView } from '@/features/pollingDay/PollingView';
import { useActiveMembership } from '@/stores/session';

/** A2: the admin's polling-day page (tiles, map, volunteers, alerts, booths without a location). Refreshes every 30 s. */
export default function PollingDayScreen() {
  const { t } = useTranslation();
  const m = useActiveMembership();
  const mid = m?.id ?? '';
  const qc = useQueryClient();
  const { live, alerts } = useAdminPolling();
  const q = useQuery({ queryKey: ['polling', mid], queryFn: () => adminApi.polling(mid), enabled: !!mid, refetchInterval: live ? 30_000 : false });

  // Opening the page (and each new alert while it is open) marks the alerts as seen, so the badge clears.
  const newest = alerts.data?.items[0]?.id;
  useFocusEffect(useCallback(() => {
    if (!mid || newest === null) return; // `newest`: run again when a new alert arrives while the page is open
    void adminApi.pollingSeen(mid).then(() => qc.invalidateQueries({ queryKey: ['pdAlerts', mid] }), () => undefined);
  }, [mid, qc, newest]));

  return (
    <Screen back={t('admin.tabs.dashboard')}>
      <LargeTitle title={t('pd.title')} subtitle={m ? t('admin.acTitle', { no: m.acNo, name: m.acName }) : undefined} />
      {!q.data ? (
        <QueryState loading={q.isLoading} error={q.isError} err={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <PollingView
          data={q.data}
          alerts={alerts.data?.items ?? []}
          onSetLocation={async (no, lat, lng) => {
            await adminApi.setBoothLocation(mid, no, lat, lng);
            await qc.invalidateQueries({ queryKey: ['polling', mid] });
          }}
        />
      )}
    </Screen>
  );
}
