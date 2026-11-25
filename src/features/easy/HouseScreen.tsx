/**
 * spec easy-redesign V3: one house — header in the house colour with a square per member, the member cards (tap to
 * mark), and "Back to <list>". Saving never moves the page; the card changes colour where it is (Undo for 5 s).
 */
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { GroupCode, Voter } from '@/api/types';
import { AppText, Icon, PathBar, Screen, Toast } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, easy, group, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { saveVoter, useVoters, type SaveHandle } from '@/features/data';
import { goBack } from '@/features/shell/navHistory';
import { VoterRow } from '@/features/voters/VoterRow';
import { usePrefs } from '@/stores/prefs';
import { houseColour } from './logic';
import { houseWord } from './labels';
import { useLastHouse } from './lastHouse';

export function HouseScreen() {
  const { t } = useTranslation();
  const { no, from, booth: bp } = useLocalSearchParams<{ no: string; from?: string; booth?: string }>();
  const myBooth = usePrefs((s) => s.booth);
  const booth = Number(bp) > 0 ? Number(bp) : myBooth;
  const votersQ = useVoters(booth);
  const remember = useLastHouse((s) => s.set);
  useEffect(() => { if (no) remember(booth, no); }, [booth, no, remember]);
  const members = useMemo(() => (votersQ.data ?? []).filter((v) => v.booth === booth && v.house === no).sort((a, b) => a.sno - b.sno), [votersQ.data, booth, no]);
  const [openId, setOpenId] = useState<string | null>(null);
  // The first person not met yet opens by itself.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- first load of this house: open the first not met
    if (openId === null && members.length) setOpenId(members.find((v) => !v.group)?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members.length]);
  const [toast, setToast] = useState<{ msg: string; undo: () => void } | null>(null);
  const colour = houseColour(members);
  const tone = colour === 'left' ? { bg: colors.surface, bd: easy.dashed, ic: colors.pressed, fg: group.none.text } : { bg: group[colour].card, bd: group[colour].strong, ic: group[colour].strong, fg: colors.textOnAccent };
  const met = members.filter((v) => v.group).length;
  const back = from || t('easy.housesTitle');

  const onGroup = useCallback((v: Voter, g: GroupCode) => {
    const h: SaveHandle = saveVoter(v, { group: g });
    setToast({ msg: t('voters.saved', { name: v.name, group: t(`groups.${g}`) }), undo: () => { h.undo(); setToast(null); } });
  }, [t]);
  const onPatch = useCallback((v: Voter, p: Partial<Voter>) => { saveVoter(v, p); }, []);
  const onToggle = useCallback((id: string) => setOpenId((c) => (c === id ? null : id)), []);

  return (
    <Screen scroll={false}>
      <PathBar back={back} onBack={goBack} crumbs={[{ label: back, onPress: goBack }, { label: t('easy.houseNo', { no }) }]} />
      {!votersQ.data ? (
        <QueryState loading={votersQ.isLoading} error={votersQ.isError} onRetry={() => void votersQ.refetch()} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 96 }} keyboardShouldPersistTaps="handled">
          <View style={[s.head, { backgroundColor: tone.bg, borderColor: tone.bd, borderStyle: colour === 'left' ? 'dashed' : 'solid' }]}>
            <View style={s.headRow}>
              <View style={[s.icon, { backgroundColor: tone.ic }]}><Icon name="home" size={34} color={tone.fg} /></View>
              <View style={{ flex: 1 }}>
                <AppText variant="largeTitle" style={{ fontSize: 28, lineHeight: 34 }}>{t('easy.houseNo', { no })}</AppText>
                <AppText variant="callout" color={colors.textSecondary}>{[members[0]?.village, houseWord(t, colour)].filter(Boolean).join(' · ')}</AppText>
              </View>
            </View>
            <View style={s.squares}>
              {members.map((v) => <View key={v.id} style={[s.sq, { backgroundColor: v.group ? group[v.group].strong : colors.surface, borderColor: v.group ? group[v.group].strong : easy.dashed }]} />)}
              <AppText variant="headline">{t('easy.metOf', { met, n: members.length })}</AppText>
            </View>
          </View>
          <View style={s.hint}><Icon name="hand-left" size={18} color={colors.textSecondary} /><AppText variant="callout" weight="semibold" color={colors.textSecondary}>{t('easy.tapPerson')}</AppText></View>
          {members.map((v) => (
            <VoterRow key={v.id} voter={v} open={v.id === openId} onToggle={onToggle} onGroup={onGroup} onPatch={onPatch} />
          ))}
          {!members.length ? <AppText variant="body" align="center" style={{ padding: 32 }}>{t('voters.empty')}</AppText> : null}
        </ScrollView>
      )}
      <Toast message={toast?.msg ?? null} onUndo={toast?.undo} onHide={() => setToast(null)} />
    </Screen>
  );
}

const s = themed(() => StyleSheet.create({
  head: { margin: spacing.lg, padding: spacing.lg, borderRadius: 22, borderWidth: 2.5, gap: spacing.md },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  squares: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  sq: { width: 26, height: 26, borderRadius: 7, borderWidth: 1.5 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
}));
