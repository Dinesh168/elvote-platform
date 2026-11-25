/**
 * spec easy-redesign V2: Booth ▾ · Section ▾ · House ▾ at the top of Home and the lists. Changing them keeps the
 * page; the numbers and lists follow. Section and house are remembered for the booth while the app is open.
 */
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { create } from 'zustand';
import type { Voter } from '@/api/types';
import { AppText, ChoiceRow, Icon, Sheet } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, easy, spacing } from '@/design/tokens';
import { BoothSheet } from '@/features/common/BoothSheet';
import { usePrefs } from '@/stores/prefs';
import { houseList } from './logic';
import { sectionKey, sectionLabel } from './labels';

interface WhereState { booth: number | null; sec: string | null; house: string | null; set: (o: Partial<Omit<WhereState, 'set'>>) => void }
export const useWhere = create<WhereState>()((set) => ({ booth: null, sec: null, house: null, set: (o) => set(o) }));

/** The where-bar choice for the current booth (reset when the booth changes). */
export function useWhereFor(booth: number) {
  const w = useWhere();
  return w.booth === booth ? { sec: w.sec, house: w.house } : { sec: null, house: null };
}
export const inWhere = (v: Voter, w: { sec: string | null; house: string | null }) =>
  (!w.sec || sectionKey(v) === w.sec) && (!w.house || v.house === w.house);

export function WhereBar({ voters }: { voters: Voter[] }) {
  const { t } = useTranslation();
  const booth = usePrefs((s) => s.booth);
  const w = useWhereFor(booth);
  const set = useWhere((s) => s.set);
  const [sheet, setSheet] = useState<'booth' | 'sec' | 'house' | null>(null);
  const secs = useMemo(() => {
    const m = new Map<string, { label: string; n: number }>();
    for (const v of voters) {
      const k = sectionKey(v);
      const cur = m.get(k);
      if (cur) cur.n += 1;
      else m.set(k, { label: sectionLabel(t, v), n: 1 });
    }
    return [...m.entries()].sort((a, b) => (parseInt(a[0], 10) || 0) - (parseInt(b[0], 10) || 0));
  }, [voters, t]);
  const houses = useMemo(() => houseList(voters.filter((v) => !w.sec || sectionKey(v) === w.sec)), [voters, w.sec]);
  const pick = (o: { sec?: string | null; house?: string | null }) => { set({ booth, sec: w.sec, house: w.house, ...o }); setSheet(null); };
  const secName = w.sec ? secs.find((x) => x[0] === w.sec)?.[1].label ?? w.sec : t('easy.all');

  return (
    <View style={s.row}>
      <Drop label={t('easy.booth')} value={String(booth)} onPress={() => setSheet('booth')} />
      <Drop label={t('easy.section')} value={secName} on={!!w.sec} onPress={() => setSheet('sec')} />
      <Drop label={t('easy.house')} value={w.house ? t('easy.houseNo', { no: w.house }) : t('easy.all')} on={!!w.house} onPress={() => setSheet('house')} />
      <BoothSheet visible={sheet === 'booth'} onClose={() => setSheet(null)} />
      <Sheet visible={sheet === 'sec'} title={t('easy.pickSection')} onClose={() => setSheet(null)}>
        <ChoiceRow title={t('easy.allSections')} subtitle={t('easy.nVoters', { n: voters.length })} selected={!w.sec} onPress={() => pick({ sec: null, house: null })} />
        {secs.map(([k, x], i) => (
          <ChoiceRow key={k} title={x.label} subtitle={t('easy.nVoters', { n: x.n })} selected={w.sec === k} last={i === secs.length - 1} onPress={() => pick({ sec: k, house: null })} />
        ))}
      </Sheet>
      <Sheet visible={sheet === 'house'} title={t('easy.pickHouse')} onClose={() => setSheet(null)}>
        <ChoiceRow title={t('easy.allHouses')} subtitle={t('easy.nHouses', { n: houses.length })} selected={!w.house} onPress={() => pick({ house: null })} />
        {houses.map((h, i) => (
          <ChoiceRow key={h.house} title={t('easy.houseNo', { no: h.house })} subtitle={t('easy.family', { name: h.head.name })} selected={w.house === h.house} last={i === houses.length - 1} onPress={() => pick({ house: h.house })} />
        ))}
      </Sheet>
    </View>
  );
}

function Drop({ label, value, onPress, on }: { label: string; value: string; onPress: () => void; on?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={onPress} style={({ pressed }) => [s.drop, on && s.dropOn, pressed && { opacity: 0.75 }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="caption" color={colors.textSecondary}>{label}</AppText>
        <AppText variant="callout" weight="bold" numberOfLines={1}>{value}</AppText>
      </View>
      <Icon name="chevron-down" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

const s = themed(() => StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  drop: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingLeft: 10, paddingRight: 6, borderRadius: 14, borderWidth: 2, borderColor: easy.tileBorder, backgroundColor: colors.surface },
  dropOn: { borderColor: easy.active, backgroundColor: easy.helpTint },
}));
