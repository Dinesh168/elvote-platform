import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { platformApi, type Customer } from '@/api/adminApi';
import { AppText, DataTable, Group, LargeTitle, Row, Screen } from '@/design/components';
import { useWide } from '@/design/layout';
import { paletteFrom } from '@/design/theme';
import { colors, radius, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';

/** C1–C7: every customer (party + assembly) we sell to, with plan and subscription at a glance. */
export default function Customers() {
  const { t } = useTranslation();
  const wide = useWide();
  const q = useQuery({ queryKey: ['customers'], queryFn: platformApi.customers });
  const open = (c: Customer) => router.push({ pathname: '/platform/customer/[id]', params: { id: c.id } });
  const featuresOn = (c: Customer) => Object.values(c.features).filter(Boolean).length;
  const statusText = (c: Customer) => (c.active ? t('cms.statusActive') : c.status !== 'active' ? t(`platform.statuses.${c.status}`) : t('cms.statusExpired'));

  return (
    <Screen back={t('platform.title')}>
      <LargeTitle title={t('cms.customers')} subtitle={t('cms.customersSub')} />
      {!q.data ? (
        <QueryState loading={q.isLoading} error={q.isError} err={q.error} onRetry={() => void q.refetch()} />
      ) : wide ? (
        <View style={s.table}>
          <DataTable
            rows={q.data}
            rowKey={(c) => c.id}
            onRowPress={open}
            rowA11y={(c) => `${c.partyName}, ${c.stateCode} ${c.acNo} ${c.acName}, ${statusText(c)}`}
            columns={[
              { key: 'name', label: t('cms.customer'), flex: 2.6, value: (c) => `${c.partyName} ${c.acName}`, render: (c) => <Name c={c} /> },
              { key: 'status', label: t('platform.status'), flex: 1.1, value: (c) => statusText(c), render: (c) => <Status c={c} text={statusText(c)} /> },
              { key: 'plan', label: t('cms.features'), flex: 0.9, align: 'right', value: (c) => featuresOn(c), render: (c) => <AppText variant="callout" tabular>{`${featuresOn(c)} / 8`}</AppText> },
              { key: 'vol', label: t('cms.volunteers'), flex: 1, align: 'right', value: (c) => c.volunteers, render: (c) => <AppText variant="callout" tabular>{c.maxVolunteers != null ? `${c.volunteers} / ${c.maxVolunteers}` : String(c.volunteers)}</AppText> },
              { key: 'until', label: t('cms.validUntil'), flex: 1.1, value: (c) => c.validUntil ?? '9999', render: (c) => <AppText variant="callout" tabular>{c.validUntil ?? '—'}</AppText> },
            ]}
          />
        </View>
      ) : (
        <Group>
          {q.data.map((c, i) => (
            <Row key={c.id} title={`${c.partyName} · ${c.stateCode} ${c.acNo} ${c.acName}`} subtitle={`${statusText(c)} · ${t('cms.featuresOn', { n: featuresOn(c) })}`}
              leading={<Swatch c={c} />} chevron onPress={() => open(c)} last={i === q.data.length - 1} />
          ))}
        </Group>
      )}
    </Screen>
  );
}

function Swatch({ c }: { c: Customer }) {
  return <View style={[s.swatch, { backgroundColor: paletteFrom(c.colour).accent }]} />;
}

function Name({ c }: { c: Customer }) {
  return (
    <View style={s.name}>
      <Swatch c={c} />
      <View style={s.flex}>
        <AppText variant="callout" weight="semibold" numberOfLines={1}>{c.appName || c.partyName}</AppText>
        <AppText variant="footnote" color={colors.textSecondary} numberOfLines={1}>{`${c.partyName} · ${c.stateCode} ${c.acNo} ${c.acName}`}</AppText>
      </View>
    </View>
  );
}

function Status({ c, text }: { c: Customer; text: string }) {
  const ok = c.active;
  return (
    <View style={[s.chip, { backgroundColor: ok ? colors.successTint : colors.dangerTint }]}>
      <AppText variant="caption" weight="semibold" color={ok ? colors.success : colors.danger}>{text}</AppText>
    </View>
  );
}

const s = StyleSheet.create({
  table: { marginTop: spacing.xl },
  name: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, minWidth: 0 },
  swatch: { width: 28, height: 28, borderRadius: radius.sm },
  chip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
});
