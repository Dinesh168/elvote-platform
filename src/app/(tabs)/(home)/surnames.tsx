import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Group, Icon, LargeTitle, Row, Screen } from '@/design/components';
import { chart, colors, fonts, radius, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { useVoters } from '@/features/data';
import { surnames } from '@/features/voters/surnames';
import { usePrefs } from '@/stores/prefs';

const fmt = (n: number) => n.toLocaleString('en-IN');

/** V-LIST-4: families by surname with group counts; tap → Voters searching that surname. */
export default function Surnames() {
  const { t } = useTranslation();
  const booth = usePrefs((s) => s.booth);
  const q = useVoters(booth);
  const [search, setSearch] = useState('');
  const rows = useMemo(() => {
    const all = q.data ? surnames(q.data, booth) : [];
    const s = search.trim().toLowerCase();
    return s ? all.filter((r) => r.surname.toLowerCase().includes(s)) : all;
  }, [q.data, booth, search]);

  return (
    <Screen width="medium" back={t('tabs.home')}>
      <LargeTitle title={t('surnames.title')} subtitle={t('surnames.sub', { no: booth })} />
      <View style={s.searchWrap}>
        <Icon name="search" size={18} color={colors.textSecondary} />
        <TextInput value={search} onChangeText={setSearch} placeholder={t('surnames.search')} placeholderTextColor={colors.textTertiary}
          accessibilityLabel={t('surnames.search')} autoCorrect={false} style={s.search} />
      </View>
      {!q.data ? (
        <QueryState loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} />
      ) : rows.length === 0 ? (
        <AppText variant="callout" color={colors.textSecondary} align="center" style={s.empty}>{t('surnames.none')}</AppText>
      ) : (
        <Group>
          {rows.map((r, i) => (
            <Row
              key={r.surname}
              title={r.surname}
              subtitle={t('surnames.row', { count: fmt(r.count), met: fmt(r.count - r.notMet) })}
              trailing={<Mini our={r.our} target={r.target} opp={r.opp} total={r.count} />}
              value={fmt(r.count)}
              chevron
              onPress={() => router.push({ pathname: '/voters', params: { q: r.surname } })}
              last={i === rows.length - 1}
              a11yLabel={`${r.surname}, ${r.count}. ${t('groups.our')} ${r.our}, ${t('groups.target')} ${r.target}, ${t('groups.opp')} ${r.opp}`}
            />
          ))}
        </Group>
      )}
    </Screen>
  );
}

/** Tiny stacked bar of Our / Target / Opposition (numbers are in the row's label). */
function Mini({ our, target, opp, total }: { our: number; target: number; opp: number; total: number }) {
  return (
    <View style={s.mini}>
      {[[our, chart.our], [target, chart.target], [opp, chart.opp], [total - our - target - opp, chart.none]].map(([n, c], i) =>
        (n as number) > 0 ? <View key={i} style={{ flex: n as number, backgroundColor: c as string }} /> : null)}
    </View>
  );
}

const s = StyleSheet.create({
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.lg, height: 44, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.fill },
  search: { flex: 1, fontSize: 17, fontFamily: fonts.regular, color: colors.text },
  empty: { padding: spacing.xxl },
  mini: { width: 56, height: 8, borderRadius: 4, overflow: 'hidden', flexDirection: 'row', gap: 1, backgroundColor: chart.track },
});
