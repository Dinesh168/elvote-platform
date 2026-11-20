import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { platformApi } from '@/api/adminApi';
import { LargeTitle, Screen } from '@/design/components';
import { QueryState } from '@/features/common/QueryState';
import { PollingView } from '@/features/pollingDay/PollingView';

/** A2 for the super-admin: the same polling-day page for any customer. */
export default function CustomerPolling() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useQuery({ queryKey: ['customer', id], queryFn: () => platformApi.customer(id), enabled: !!id });
  const q = useQuery({
    queryKey: ['custPolling', id],
    queryFn: () => platformApi.customerPolling(id),
    enabled: !!id,
    refetchInterval: (qq) => (qq.state.data?.inWindow ? 30_000 : false),
  });
  return (
    <Screen back={c.data ? c.data.partyName : t('cms.customers')}>
      <LargeTitle title={t('pd.title')} subtitle={c.data ? `${c.data.partyName} · ${t('admin.acTitle', { no: c.data.acNo, name: c.data.acName })}` : undefined} />
      {!q.data ? <QueryState loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} /> : <PollingView data={q.data} />}
    </Screen>
  );
}
