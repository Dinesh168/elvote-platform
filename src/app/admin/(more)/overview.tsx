import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { authApi, type OverviewRow } from '@/api/adminApi';
import { AppText, Group, LargeTitle, ProgressBar, Row, Screen } from '@/design/components';
import { colors, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { activate } from '@/features/session/session';

/**
 * State overview (spec accounts-access AC9): every assembly this admin looks after, grouped by state —
 * volunteers, requests waiting, voters met. Tap one to open its pages.
 */
export default function AdminOverview() {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['meOverview'], queryFn: authApi.overview });
  const rows = q.data?.rows ?? [];
  const byState = new Map<string, OverviewRow[]>();
  for (const r of rows) byState.set(r.stateCode, [...(byState.get(r.stateCode) ?? []), r]);
  const open = async (r: OverviewRow) => {
    await activate({ mode: 'admin', membershipId: r.membershipId, path: '/admin/dashboard' });
    router.replace('/admin/dashboard');
  };
  return (
    <Screen width="medium" back={t('admin.tabs.more')}>
      <LargeTitle title={t('overview.title')} subtitle={q.data ? t('overview.count', { count: rows.length }) : undefined} />
      {!q.data ? (
        <QueryState loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} />
      ) : (
        [...byState.entries()].map(([st, list]) => (
          <Group key={st} header={st}>
            {list.sort((a, b) => a.acNo - b.acNo).map((r, i) => (
              <Row
                key={r.membershipId}
                title={`${r.acNo} · ${r.acName}`}
                subtitle={`${r.partyName} · ${t('overview.row', { v: r.volunteers, p: r.pending })}`}
                trailing={
                  <View style={s.pct}>
                    <AppText variant="callout" weight="semibold">{`${r.contactedPct}%`}</AppText>
                    <ProgressBar value={r.contactedPct / 100} />
                  </View>
                }
                a11yLabel={`${r.acNo} ${r.acName}, ${t('overview.row', { v: r.volunteers, p: r.pending })}, ${t('overview.met', { pct: r.contactedPct })}`}
                chevron
                onPress={() => void open(r)}
                last={i === list.length - 1}
              />
            ))}
          </Group>
        ))
      )}
      {q.data && !rows.length ? <AppText variant="body" color={colors.textSecondary} style={s.empty}>{t('overview.none')}</AppText> : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  pct: { width: 72, gap: 4, alignItems: 'flex-end' },
  empty: { padding: spacing.xl, textAlign: 'center' },
});
