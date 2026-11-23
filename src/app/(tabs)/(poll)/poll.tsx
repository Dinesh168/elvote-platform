import * as Haptics from 'expo-haptics';
import { useFeature } from '@/features/session/customer';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import type { Voter } from '@/api/types';
import { AppText, Button, GroupTag, Icon, LargeTitle, Screen } from '@/design/components';
import { useWide } from '@/design/layout';
import { colors, group, hairline, radius, spacing } from '@/design/tokens';
import { BoothSheet } from '@/features/common/BoothSheet';
import { QueryState } from '@/features/common/QueryState';
import { saveVoter, useBooths, useVoters, type SaveHandle } from '@/features/data';
import { evaluateEntry, pressKey, type Key } from '@/features/poll/keypad';
import { notVotedByGroup } from '@/features/stats/selectors';
import { usePrefs } from '@/stores/prefs';
import { relText } from '@/features/voters/rel';

const KEYS: (Key | 'ok')[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'ok'];
const R = 19;
const CIRC = 2 * Math.PI * R;
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export default function PollScreen() {
  const { t } = useTranslation();
  const booth = usePrefs((s) => s.booth);
  const boothInfo = useBooths().data?.find((b) => b.no === booth);
  const q = useVoters(booth);
  const [num, setNum] = useState('');
  const [flash, setFlash] = useState<string | null>(null);
  const [recent, setRecent] = useState<{ voter: Voter; handle: SaveHandle }[]>([]);
  const [sheet, setSheet] = useState(false);

  const bySno = useMemo(() => new Map((q.data ?? []).map((v) => [v.sno, v])), [q.data]);
  const left = useMemo(() => (q.data ? notVotedByGroup(q.data, booth) : null), [q.data, booth]);
  const total = q.data?.length ?? 0;
  const voted = left ? total - left.all : 0;
  const pctN = total ? Math.round((voted / total) * 100) : 0;
  const needsHelp = useMemo(() => (q.data ?? []).filter((v) => v.needsHelp && !v.votedAt).length, [q.data]);
  const entry = evaluateEntry(num, bySno);

  const mark = () => {
    if (!entry.canMark || !entry.voter) return;
    const v = entry.voter;
    const handle = saveVoter(v, { votedAt: new Date().toISOString() });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRecent((r) => [{ voter: v, handle }, ...r].slice(0, 2));
    setFlash(v.name);
    setNum('');
  };
  const press = (k: Key | 'ok') => {
    if (k === 'ok') return mark();
    setFlash(null);
    setNum((n) => pressKey(n, k));
  };
  // Web desktop: type the serial number on the keyboard; Enter marks Voted, Backspace deletes (no on-screen keypad).
  const wide = useWide();
  const helpOn = useFeature('help');
  useEffect(() => {
    if (!wide || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[0-9]$/.test(e.key)) press(e.key as Key);
      else if (e.key === 'Backspace') press('back');
      else if (e.key === 'Enter') press('ok');
      else if (e.key === 'Escape') setNum('');
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  useEffect(() => {
    if (entry.state === 'already') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [entry.state]);

  const tone =
    entry.state === 'found' ? { bg: colors.surface, border: colors.accent, fg: colors.text }
    : entry.state === 'already' ? { bg: group.target.tint, border: colors.warningFill, fg: colors.warning }
    : entry.state === 'missing' ? { bg: group.opp.tint, border: colors.dangerFill, fg: colors.danger }
    : flash ? { bg: group.our.tint, border: colors.successFill, fg: colors.success }
    : { bg: colors.surface, border: 'transparent', fg: colors.textSecondary };

  const msg =
    entry.state === 'already' ? t('poll.already', { time: time(entry.voter!.votedAt!), name: entry.voter!.name })
    : entry.state === 'missing' ? t('poll.missing', { no: num, booth })
    : entry.state === 'typing' ? t('poll.typing')
    : flash ? t('poll.marked', { name: flash })
    : t('poll.hint');

  return (
    <Screen width="medium"
      scroll={false}
      back={t('tabs.home')}
      onBack={() => router.navigate('/home')}
      inlineTitle={t('poll.title')}
      trailing={
        <View style={s.live}>
          <View style={s.liveDot} />
          <AppText variant="footnote" weight="semibold" color={colors.danger}>{t('poll.live')}</AppText>
        </View>
      }
    >
      {wide ? <LargeTitle title={t('poll.title')} subtitle={t('poll.keyboardHint')} /> : null}
      {!left ? (
        <QueryState loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} />
      ) : (
        <View style={[s.top, wide && s.topWide]}>
          <View style={s.card}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${t('poll.votedOf', { voted, total })}. ${t('common.booth', { no: booth })}. ${t('common.change')}`} onPress={() => setSheet(true)} style={({ pressed }) => [s.summary, pressed && { backgroundColor: colors.pressed }]}>
              <View style={s.ring}>
                <Svg width={46} height={46}>
                  <Circle cx={23} cy={23} r={R} stroke={colors.ringTrack} strokeWidth={5} fill="none" />
                  <Circle cx={23} cy={23} r={R} stroke={colors.accent} strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray={`${(CIRC * pctN) / 100} ${CIRC}`} transform="rotate(-90 23 23)" />
                </Svg>
                <AppText variant="caption" weight="bold" tabular style={s.ringText}>{`${pctN}%`}</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="headline" tabular>{t('poll.votedOf', { voted: voted.toLocaleString('en-IN'), total: total.toLocaleString('en-IN') })}</AppText>
                <AppText variant="callout" color={colors.textSecondary} numberOfLines={1}>{`${t('common.booth', { no: booth })} · ${boothInfo?.name ?? ''}`}</AppText>
              </View>
              <AppText variant="callout" color={colors.accent}>{t('common.change')}</AppText>
            </Pressable>
            <View style={s.cells}>
              {([['our', 'ourNotVoted'], ['target', 'targetNotVoted'], ['opp', 'oppNotVoted'], ['all', 'notVoted']] as const).map(([g, preset], i) => {
                const color = g === 'all' ? colors.text : group[g].strong;
                const label = g === 'all' ? t('poll.all') : g === 'opp' ? t('poll.oppShort') : t(`groups.${g}`);
                return (
                  <Pressable key={g} accessibilityRole="button" accessibilityLabel={`${label} ${left[g]} ${t('poll.notVotedYet')}`} onPress={() => router.push({ pathname: '/voters', params: { preset } })} style={({ pressed }) => [s.cell, i < 3 && s.cellDivider, pressed && { backgroundColor: colors.pressed }]}>
                    <AppText variant="title2" color={color} tabular style={{ fontSize: 20, lineHeight: 24 }}>{left[g].toLocaleString('en-IN')}</AppText>
                    <AppText variant="caption" weight="semibold" color={g === 'all' ? colors.textSecondary : color}>{label}</AppText>
                  </Pressable>
                );
              })}
            </View>
            <AppText variant="caption" color={colors.textSecondary} align="center" style={{ paddingBottom: 6 }}>{t('poll.notVotedYet').toLocaleUpperCase()}</AppText>
            <Pressable accessibilityRole="button" accessibilityLabel={t('call.row')} onPress={() => router.push('/call-list')} style={({ pressed }) => [s.helpRow, pressed && { backgroundColor: colors.pressed }]}>
              <Icon name="call" size={20} color={colors.success} />
              <AppText variant="body" style={{ flex: 1 }}>{t('call.row')}</AppText>
              <AppText variant="body" color={colors.textSecondary} tabular>{left ? left.our : 0}</AppText>
              <Icon name="chevron-forward" size={18} color={colors.chevron} />
            </Pressable>
            {helpOn ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`${t('poll.needsHelp')} ${needsHelp}`} onPress={() => router.push('/help')} style={({ pressed }) => [s.helpRow, pressed && { backgroundColor: colors.pressed }]}>
              <AppText variant="body" style={{ flex: 1 }}>{t('poll.needsHelp')}</AppText>
              <AppText variant="body" color={colors.textSecondary} tabular>{needsHelp}</AppText>
              <Icon name="chevron-forward" size={18} color={colors.chevron} />
            </Pressable>
            ) : null}
          </View>

          <View style={[s.panel, { backgroundColor: tone.bg, borderColor: tone.border }]} accessibilityLiveRegion="polite">
            <View style={s.panelTop}>
              <View style={{ flex: 1 }}>
                <AppText variant="footnote" color={colors.textSecondary}>{t('poll.serial')}</AppText>
                <AppText variant="largeTitle" tabular style={{ fontSize: 34, letterSpacing: 1 }}>{num || '—'}</AppText>
              </View>
              {num ? (
                <Pressable accessibilityRole="button" accessibilityLabel={t('poll.clear')} onPress={() => setNum('')} style={[s.smallBtn, s.clearBtn]} hitSlop={6}>
                  <Icon name="close-circle" size={20} color={colors.textSecondary} />
                  <AppText variant="callout" weight="semibold" color={colors.textSecondary}>{t('poll.clear')}</AppText>
                </Pressable>
              ) : (
                <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/voters', params: { focus: '1' } })} style={[s.smallBtn, { backgroundColor: colors.accentTint, flexDirection: 'row', gap: 6 }]}>
                  <Icon name="search" size={16} color={colors.accent} />
                  <AppText variant="callout" weight="semibold" color={colors.accent}>{t('poll.findByName')}</AppText>
                </Pressable>
              )}
            </View>
            {entry.state === 'found' && entry.voter ? (
              <>
                <View style={s.found}>
                  <AppText variant="title2">{entry.voter.name}</AppText>
                  <GroupTag code={entry.voter.group} label={entry.voter.group ? t(`groups.${entry.voter.group}`) : t('groups.none')} />
                </View>
                <AppText variant="callout" color={colors.textSecondary}>{`S.No ${entry.voter.sno} · ${relText(t, entry.voter.relation)} ${entry.voter.relative} · ${entry.voter.age} · ${t('voters.houseShort', { house: entry.voter.house })}`}</AppText>
              </>
            ) : (
              <AppText variant="callout" weight="medium" color={tone.fg}>{msg}</AppText>
            )}
            {wide ? (
              <View style={s.deskActions}>
                <Button kind="success" label={`✓ ${t('poll.voted')}  (Enter)`} disabled={!entry.canMark} onPress={() => press('ok')} a11yLabel={t('poll.markA11y')} />
              </View>
            ) : null}
          </View>

          <View style={s.recent}>
            <AppText variant="footnote" color={colors.textSecondary}>{t('poll.last').toLocaleUpperCase()}</AppText>
            {recent.length === 0 ? (
              <AppText variant="callout" color={colors.textSecondary}>{t('poll.lastEmpty')}</AppText>
            ) : (
              recent.map(({ voter, handle }) => (
                <Pressable
                  key={voter.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('common.undo')} ${voter.name}`}
                  onPress={() => {
                    handle.undo();
                    setRecent((r) => r.filter((x) => x.voter.id !== voter.id));
                    setFlash(null);
                  }}
                  style={s.recentChip}
                >
                  <AppText variant="callout" weight="semibold" color={colors.success}>{`✓ ${voter.sno}`}</AppText>
                  <AppText variant="callout" weight="semibold">{voter.name.split(' ')[0]}</AppText>
                  <AppText variant="callout" weight="semibold" color={colors.accent}>{t('common.undo')}</AppText>
                </Pressable>
              ))
            )}
          </View>
        </View>
      )}

      <View style={{ flex: 1 }} />
      {wide ? null : (
      <View style={s.pad}>
        {KEYS.map((k) => {
          const ok = k === 'ok';
          const back = k === 'back';
          return (
            <Pressable
              key={k}
              accessibilityRole="button"
              accessibilityLabel={ok ? t('poll.markA11y') : back ? t('poll.deleteA11y') : k}
              accessibilityHint={back ? t('poll.holdToClear') : undefined}
              accessibilityState={ok ? { disabled: !entry.canMark } : undefined}
              onPress={() => press(k)}
              onLongPress={back ? () => { setFlash(null); setNum(''); } : undefined}
              style={({ pressed }) => [s.key, back && { backgroundColor: colors.keypadFn }, ok && { backgroundColor: entry.canMark ? colors.success : colors.keypadDisabled }, pressed && { opacity: 0.6 }]}
            >
              {back ? (
                <Icon name="backspace-outline" size={26} color={colors.text} />
              ) : ok ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="checkmark" size={22} color={colors.textOnAccent} />
                  <AppText variant="headline" weight="bold" color={colors.textOnAccent}>{t('poll.voted')}</AppText>
                </View>
              ) : (
                <AppText variant="title2" weight="medium" tabular style={{ fontSize: 26, lineHeight: 32 }}>{k}</AppText>
              )}
            </Pressable>
          );
        })}
      </View>
      )}
      <BoothSheet visible={sheet} onClose={() => setSheet(false)} />
    </Screen>
  );
}

const s = StyleSheet.create({
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, backgroundColor: colors.dangerTint },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.dangerFill },
  topWide: { paddingTop: spacing.xl, gap: spacing.md },
  deskActions: { flexDirection: 'row', marginTop: spacing.md },
  top: { paddingHorizontal: spacing.lg, paddingTop: 4, gap: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 10, borderBottomWidth: hairline, borderBottomColor: colors.separator },
  ring: { width: 46, height: 46 },
  ringText: { position: 'absolute', left: 0, right: 0, top: 15, textAlign: 'center' },
  cells: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  cellDivider: { borderRightWidth: hairline, borderRightColor: colors.separator },
  helpRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, paddingHorizontal: spacing.lg, borderTopWidth: hairline, borderTopColor: colors.separator },
  panel: { borderRadius: radius.lg, borderWidth: 2, paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 12, gap: 2 },
  panelTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  smallBtn: { height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' },
  found: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  recent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 36, paddingHorizontal: 4, flexWrap: 'wrap' },
  recentChip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 10, borderRadius: 16, backgroundColor: colors.surface },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 6, backgroundColor: colors.keypadBg },
  key: { width: '31.9%', flexGrow: 1, height: 50, borderRadius: 8, backgroundColor: colors.keypadKey, alignItems: 'center', justifyContent: 'center', shadowColor: colors.text, shadowOpacity: 0.3, shadowRadius: 0, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
});
