import { useQuery, useQueryClient } from '@tanstack/react-query';
import { themed } from '@/design/theme';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/api/adminApi';
import { AppText, ChoiceRow, Group, Icon, LargeTitle, Row, Screen, Sheet } from '@/design/components';
import { colors, radius, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { loadMe } from '@/features/session/session';
import { useActiveMembership } from '@/stores/session';

/** A-ZONE-1 + owner request: admin picks the number of zones (1…max set by super-admin) and moves booths. */
export default function Zones() {
  const { t } = useTranslation();
  const m = useActiveMembership();
  const mid = m?.id ?? '';
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['zones', mid], queryFn: () => adminApi.zones(mid), enabled: !!mid });
  const [count, setCount] = useState<number | null>(null);
  const [move, setMove] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const z = q.data;
  const shown = count ?? z?.zoneCount ?? 0;
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['zones', mid] });
    await qc.invalidateQueries({ queryKey: ['dash', mid] });
    await loadMe();
  };
  const apply = (n: number) => {
    setError(null);
    setCount(n);
    adminApi.setZoneCount(mid, n).then(refresh, (e: Error) => { setError(e.message); setCount(null); });
  };
  const zoneOf = (no: number) => z?.zones.find((x) => x.booths.includes(no));

  return (
    <Screen width="narrow" back={t('admin.tabs.more')}>
      <LargeTitle title={t('admin.zones')} subtitle={m ? t('admin.acTitle', { no: m.acNo, name: m.acName }) : undefined} />
      {!z ? (
        <QueryState loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <Group header={t('admin.zoneCount')} footer={`${t('admin.zoneMax', { max: z.maxZones })} ${t('admin.reduceWarn')}`}>
            <View style={s.stepper}>
              <StepBtn icon="remove" label="−" disabled={shown <= 1} onPress={() => apply(shown - 1)} />
              <AppText variant="largeTitle" tabular style={s.count}>{String(shown)}</AppText>
              <StepBtn icon="add" label="+" disabled={shown >= z.maxZones} onPress={() => apply(shown + 1)} />
            </View>
            {error ? <AppText variant="footnote" color={colors.danger} style={s.err}>{error}</AppText> : null}
          </Group>
          {z.unassigned.length ? (
            <Group header={t('admin.unassigned')}>
              <View style={s.chips}>
                {z.unassigned.map((no) => (
                  <Pressable key={no} accessibilityRole="button" accessibilityLabel={t('admin.moveTo', { no })} onPress={() => setMove(no)} style={[s.chip, s.warn]}>
                    <AppText variant="callout" weight="semibold">{String(no)}</AppText>
                  </Pressable>
                ))}
              </View>
            </Group>
          ) : null}
          <Group header={t('admin.zones')}>
            {z.zones.map((zone, i) => (
              <View key={zone.id} style={[s.zone, i < z.zones.length - 1 && s.divider]}>
                <AppText variant="headline">{`${zone.name} · ${t('admin.zoneBooths', { n: zone.booths.length })}`}</AppText>
                <View style={s.chips0}>
                  {zone.booths.map((no) => (
                    <Pressable key={no} accessibilityRole="button" accessibilityLabel={t('admin.moveTo', { no })} onPress={() => setMove(no)} style={s.chip}>
                      <AppText variant="callout">{String(no)}</AppText>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </Group>
          {move != null ? (
            <Sheet visible title={t('admin.moveTo', { no: move })} onClose={() => setMove(null)}>
              {z.zones.map((zone) => (
                <ChoiceRow key={zone.id} title={zone.name} selected={zoneOf(move)?.id === zone.id}
                  onPress={() => { const no = move; setMove(null); void adminApi.moveBooths(mid, [no], zone.id).then(refresh); }} />
              ))}
              <Row title={t('admin.noZone')} last onPress={() => { const no = move; setMove(null); void adminApi.moveBooths(mid, [no], null).then(refresh); }} />
            </Sheet>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function StepBtn({ icon, label, disabled, onPress }: { icon: string; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [s.step, disabled && { opacity: 0.35 }, pressed && { opacity: 0.6 }]}>
      <Icon name={icon} size={28} color={colors.accent} />
    </Pressable>
  );
}

const s = themed(() => StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xxl, padding: spacing.lg },
  step: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  count: { minWidth: 60, textAlign: 'center' },
  err: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, padding: spacing.lg },
  chips0: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minWidth: 52, height: 40, paddingHorizontal: spacing.md, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.fill },
  warn: { backgroundColor: colors.accentTint },
  zone: { padding: spacing.lg, gap: spacing.sm },
  divider: { borderBottomWidth: 0.5, borderBottomColor: colors.separator },
}));
