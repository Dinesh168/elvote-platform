import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/api/adminApi';
import { AppText, Icon, LargeTitle, Screen, SegmentedControl } from '@/design/components';
import { themed } from '@/design/theme';
import { chart, colors, fonts, hairline, radius, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { useActiveMembership } from '@/stores/session';

const fmt = (n: number) => n.toLocaleString('en-IN');
const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);

/**
 * Admin → Dashboard → Surnames (spec usability-r2 A2): every surname in the assembly with its voter count, % met and
 * % our; search, zone filter, sort by most voters or A–Z. Counts only (no voter details).
 */
export default function AdminSurnames() {
  const { t } = useTranslation();
  const m = useActiveMembership();
  const mid = m?.id ?? '';
  const [zone, setZone] = useState<string | undefined>();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'count' | 'az'>('count');
  const zonesQ = useQuery({ queryKey: ['zones', mid], queryFn: () => adminApi.zones(mid), enabled: !!mid });
  const dataQ = useQuery({ queryKey: ['surnames', mid, zone ?? ''], queryFn: () => adminApi.surnames(mid, { zone }), enabled: !!mid });
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = (dataQ.data?.surnames ?? []).filter((r) => !s || r.surname.toLowerCase().includes(s));
    return sort === 'az' ? [...list].sort((a, b) => a.surname.localeCompare(b.surname)) : list;
  }, [dataQ.data, q, sort]);
  const zones = zonesQ.data?.zones ?? [];

  return (
    <Screen width="medium" back={t('admin.tabs.dashboard')} scroll={false}>
      <LargeTitle title={t('asur.title')} subtitle={dataQ.data ? t('asur.sub', { n: fmt(dataQ.data.surnames.length), voters: fmt(dataQ.data.voters) }) : undefined} />
      <View style={s.controls}>
        <View style={s.search}>
          <Icon name="search" size={18} color={colors.textSecondary} />
          <TextInput value={q} onChangeText={setQ} placeholder={t('asur.search')} placeholderTextColor={colors.textTertiary} style={s.input} accessibilityLabel={t('asur.search')} autoCorrect={false} />
        </View>
        {zones.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {[{ id: undefined, name: t('admin.allZones') }, ...zones.map((z) => ({ id: z.id as string | undefined, name: z.name }))].map((z) => {
              const on = zone === z.id;
              return (
                <Pressable key={z.id ?? 'all'} accessibilityRole="radio" accessibilityState={{ selected: on, checked: on }} aria-checked={on} onPress={() => setZone(z.id)} style={[s.chip, on && s.chipOn]}>
                  <AppText variant="callout" weight="semibold" color={on ? colors.textOnAccent : colors.text}>{z.name}</AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
        <SegmentedControl options={[{ value: 'count', label: t('asur.most') }, { value: 'az', label: t('asur.az') }]} value={sort} onChange={setSort} />
      </View>
      {!dataQ.data ? (
        <QueryState loading={dataQ.isLoading} error={dataQ.isError} err={dataQ.error} onRetry={() => void dataQ.refetch()} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.surname}
          initialNumToRender={25}
          keyboardDismissMode="on-drag"
          contentContainerStyle={s.list}
          ListEmptyComponent={<AppText variant="callout" color={colors.textSecondary} align="center" style={s.empty}>{t('asur.none')}</AppText>}
          renderItem={({ item, index }) => {
            const met = pct(item.met, item.total);
            const our = pct(item.our, item.total);
            return (
              <View style={[s.row, index === 0 && s.first, index === rows.length - 1 && s.last]} accessible
                accessibilityLabel={t('asur.a11y', { name: item.surname, n: fmt(item.total), met, our })}>
                <View style={s.rowTop}>
                  <AppText variant="headline" style={s.flex} numberOfLines={1}>{item.surname}</AppText>
                  <AppText variant="headline" tabular>{fmt(item.total)}</AppText>
                </View>
                <View style={s.track}>
                  <View style={[s.fill, { width: `${our}%`, backgroundColor: chart.our }]} />
                  <View style={[s.fill, { width: `${Math.max(0, met - our)}%`, backgroundColor: colors.successTint }]} />
                </View>
                <AppText variant="footnote" color={colors.textSecondary}>{t('asur.line', { met, our, target: fmt(item.target), opp: fmt(item.opp) })}</AppText>
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}

const s = themed(() => StyleSheet.create({
  controls: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 40, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.fill },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 17, color: colors.text, height: 40 },
  chips: { gap: spacing.sm },
  chip: { minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.full, justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.separator },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
  row: { backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingVertical: 10, gap: 6, borderBottomWidth: hairline, borderBottomColor: colors.separator },
  first: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  last: { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg, borderBottomWidth: 0 },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  flex: { flex: 1, minWidth: 0 },
  track: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.ringTrack },
  fill: { height: 6 },
  empty: { padding: spacing.xxl },
}));
