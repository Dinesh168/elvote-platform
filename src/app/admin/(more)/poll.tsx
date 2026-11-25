import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/api/adminApi';
import { AppText, BarList, Group, LargeTitle, ProgressBar, Row, Screen } from '@/design/components';
import { chart, colors, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { useActiveMembership } from '@/stores/session';

const fmt = (n: number) => n.toLocaleString('en-IN');

/** A-POLL-1: poll % overall and by zone; booths lowest first with our-not-voted. Refreshes every 30 s. */
export default function AdminPoll() {
  const { t } = useTranslation();
  const m = useActiveMembership();
  const mid = m?.id ?? '';
  const q = useQuery({ queryKey: ['poll', mid], queryFn: () => adminApi.poll(mid), enabled: !!mid, refetchInterval: 30_000 });
  const p = q.data;
  return (
    <Screen width="medium" back={t('admin.tabs.more')}>
      <LargeTitle title={t('admin.poll')} subtitle={m ? t('admin.acTitle', { no: m.acNo, name: m.acName }) : undefined} />
      {!p ? (
        <QueryState loading={q.isLoading} error={q.isError} err={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <Group>
            <View style={s.hero}>
              <AppText variant="largeTitle" tabular>{`${p.pct}%`}</AppText>
              <AppText variant="callout" color={colors.textSecondary}>{t('admin.pollVoted', { voted: fmt(p.voted), total: fmt(p.total) })}</AppText>
              <ProgressBar value={p.total ? p.voted / p.total : 0} />
            </View>
          </Group>
          <Group header={t('admin.notVotedYet')}>
            <Row title={t('groups.our')} value={fmt(p.notVoted.our)} leading={<Dot color={chart.our} />} />
            <Row title={t('groups.target')} value={fmt(p.notVoted.target)} leading={<Dot color={chart.target} />} />
            <Row title={t('groups.opp')} value={fmt(p.notVoted.opp)} leading={<Dot color={chart.opp} />} />
            <Row title={t('admin.helpPending')} value={fmt(p.helpPending)} last />
          </Group>
          <Group header={t('admin.pollByZone')}>
            <BarList a11yLabel={t('admin.pollByZone')} max={100} items={p.zones.map((z) => ({ key: z.name, label: z.name, value: z.pct, display: `${z.pct}%`, sub: `${fmt(z.voted)}/${fmt(z.total)}` }))} />
          </Group>
          <Group header={t('admin.boothsLowest')}>
            {p.booths.map((b, i) => (
              <Row key={b.no} title={`${b.no} · ${b.name}`} subtitle={`${t('admin.ourNotVoted', { n: b.ourNotVoted })}${b.helpPending ? ` · ${t('admin.helpPending')} ${b.helpPending}` : ''}`}
                value={`${b.pct}%`} chevron onPress={() => router.push({ pathname: '/admin/booth', params: { no: String(b.no) } })} last={i === p.booths.length - 1} />
            ))}
          </Group>
        </>
      )}
    </Screen>
  );
}

function Dot({ color }: { color: string }) {
  return <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color }} />;
}

const s = StyleSheet.create({ hero: { padding: spacing.lg, gap: spacing.sm } });
