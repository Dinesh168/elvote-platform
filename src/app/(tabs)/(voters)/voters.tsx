import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { themed } from '@/design/theme';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { GroupCode, Task, Voter } from '@/api/types';
import { AppText, ChoiceRow, Icon, LargeTitle, Screen, SegmentedControl, Sheet, Toast } from '@/design/components';
import { TeamBar } from '@/features/shell/TeamBar';
import { SyncBadge } from '@/features/sync/SyncBadge';
import { colors, fonts, radius, spacing } from '@/design/tokens';
import { BoothSheet } from '@/features/common/BoothSheet';
import { QueryState } from '@/features/common/QueryState';
import { queryClient, keys, saveVoter, useBooths, useTasks, useVoters, type SaveHandle } from '@/features/data';
import { byHouse, filterVoters, isPreset, nextOpenAfter, orderVoters, type Chip, type Preset, type View as ListView } from '@/features/voters/filter';
import { matchesTask, nextVoter } from '@/features/voters/nextVoter';
import { VoterRow } from '@/features/voters/VoterRow';
import { usePrefs } from '@/stores/prefs';

type Item =
  | { kind: 'head'; key: string; title: string; badge: string; house: string; voters: Voter[]; place: string }
  | { kind: 'gap'; key: string }
  | { kind: 'voter'; key: string; voter: Voter; first: boolean; last: boolean };

const CHIPS: Chip[] = ['all', 'todo', 'our', 'target', 'opp'];

export default function VotersScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ open?: string; task?: string; chip?: string; preset?: string; focus?: string; q?: string }>();
  const booth = usePrefs((s) => s.booth);
  const boothInfo = useBooths().data?.find((b) => b.no === booth);
  const votersQ = useVoters(booth);
  const tasks = useTasks().data;

  const [q, setQ] = useState('');
  const [view, setView] = useState<ListView>('house');
  const [chip, setChip] = useState<Chip>('all');
  const [preset, setPreset] = useState<Preset | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [house, setHouse] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; undo: () => void } | null>(null);
  const [boothSheet, setBoothSheet] = useState(false);
  const listRef = useRef<FlashListRef<Item>>(null);

  // Apply navigation params from Home / stats (each navigation sets a fresh filter).
  const paramKey = JSON.stringify(params);
  /* eslint-disable react-hooks/set-state-in-effect -- a navigation (new params) resets the filters on purpose */
  useEffect(() => {
    setChip(CHIPS.includes(params.chip as Chip) ? (params.chip as Chip) : 'all');
    setPreset(isPreset(params.preset) ? params.preset : null);
    setTaskId(params.task ?? null);
    setHouse(null);
    setQ(params.q ?? '');
    if (params.open) setOpenId(params.open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const task: Task | null = useMemo(() => tasks?.find((x) => x.id === taskId) ?? null, [tasks, taskId]);

  const ordered = useMemo(() => {
    if (!votersQ.data) return [];
    const list = filterVoters(votersQ.data, { booth, q, chip, preset, house }).filter((v) => house || matchesTask(v, task));
    return orderVoters(list, house ? 'house' : view);
  }, [votersQ.data, booth, q, chip, preset, house, task, view]);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    const sections = view === 'house' || house ? byHouse(ordered) : ordered.length ? [{ house: '', voters: ordered }] : [];
    for (const sec of sections) {
      if (sec.house) {
        const met = sec.voters.filter((v) => v.group).length;
        const v0 = sec.voters[0];
        out.push({ kind: 'head', key: `h-${sec.house}`, house: sec.house, voters: sec.voters, title: t('voters.house', { no: sec.house }),
          badge: t('voters.houseCount', { count: sec.voters.length, met }), place: [v0?.ward ? t('voters.wardN', { n: v0.ward }) : null, v0?.village].filter(Boolean).join(', ') });
      } else out.push({ kind: 'gap', key: 'gap' });
      sec.voters.forEach((v, i) => out.push({ kind: 'voter', key: v.id, voter: v, first: i === 0, last: i === sec.voters.length - 1 }));
    }
    return out;
  }, [ordered, view, house, t]);

  const itemCount = useRef(0);
  useEffect(() => { itemCount.current = items.length; }, [items.length]);
  const scrollTo = useCallback(
    (id: string | null) => {
      if (!id) return;
      let index = items.findIndex((it) => it.kind === 'voter' && it.voter.id === id);
      if (index < 0) return;
      // Show the house header above the voter for context.
      if (index > 0 && items[index - 1].kind === 'head') index -= 1;
      // FlashList measures rows lazily: scroll, then correct once the nearby rows have real sizes.
      // The list can shrink before the delayed scroll runs (search typed): skip a row that is no longer there.
      const go = (animated: boolean) => {
        if (index >= itemCount.current) return;
        try {
          listRef.current?.scrollToIndex({ index, animated, viewPosition: 0 });
        } catch {
          // not laid out yet; the list stays where it is
        }
      };
      setTimeout(() => go(false), 100);
      setTimeout(() => go(true), 450);
    },
    [items],
  );

  // Scroll to the voter opened from Home once the list reflects the link's filters.
  const pendingScroll = useRef<string | null>(null);
  useEffect(() => {
    pendingScroll.current = params.open ?? null;
  }, [paramKey, params.open]);
  useEffect(() => {
    const id = pendingScroll.current;
    if (!id || taskId !== (params.task ?? null)) return;
    if (!items.some((it) => it.kind === 'voter' && it.voter.id === id)) return;
    pendingScroll.current = null;
    scrollTo(id);
  }, [items, taskId, params.task, scrollTo]);

  const markTaskWorked = () => {
    if (!taskId) return;
    queryClient.setQueryData<Task[]>(keys.tasks, (old) => old?.map((x) => (x.id === taskId ? { ...x, lastWorkedAt: new Date().toISOString() } : x)));
  };

  const onGroup = useCallback(
    (v: Voter, g: GroupCode) => {
      const handle: SaveHandle = saveVoter(v, { group: g });
      markTaskWorked();
      const after = ordered.map((x) => (x.id === v.id ? { ...x, group: g } : x));
      const next = nextOpenAfter(after, v.id);
      setOpenId(next);
      scrollTo(next);
      setToast({
        msg: t('voters.saved', { name: v.name, group: t(`groups.${g}`) }),
        undo: () => {
          handle.undo();
          setOpenId(v.id);
          scrollTo(v.id);
          setToast(null);
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ordered, scrollTo, t, taskId],
  );

  const onPatch = useCallback((v: Voter, patch: Partial<Voter>) => {
    saveVoter(v, patch);
  }, []);

  const onToggle = useCallback((id: string) => setOpenId((cur) => (cur === id ? null : id)), []);
  // spec voter-card C2: one tap sets the group for everyone in the house (families usually vote together); Undo reverses all.
  const [markHouse, setMarkHouse] = useState<{ house: string; voters: Voter[] } | null>(null);
  const markWholeHouse = (g: GroupCode) => {
    if (!markHouse) return;
    const handles = markHouse.voters.map((v) => saveVoter(v, { group: g }));
    markTaskWorked();
    const h = markHouse.house;
    setMarkHouse(null);
    setToast({ msg: t('voters.houseSaved', { house: h, count: handles.length, group: t(`groups.${g}`) }), undo: () => { handles.forEach((x) => x.undo()); setToast(null); } });
  };
  const onSameAddress = useCallback((h: string) => {
    setHouse(h);
    setOpenId(null);
  }, []);

  const pickBooth = () => setBoothSheet(true);
  useEffect(() => {
    // Booth changed: reset and open the first voter to meet.
    if (!votersQ.data) return;
    if (params.open && votersQ.data.some((v) => v.id === params.open)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- booth changed: reset the list and open the next voter
    setHouse(null);
    setOpenId(nextVoter(votersQ.data, booth, task)?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booth, votersQ.data === undefined]);

  const presetLabel = preset ? t(`stats.${preset}`, { defaultValue: '' }) || t(`poll.${preset}`, { defaultValue: preset }) : null;

  return (
    <Screen width="medium"
      scroll={false}
      back={house ? t('voters.title') : undefined}
      onBack={house ? () => setHouse(null) : undefined}
      header={house ? undefined : <TeamBar trailing={<SyncBadge />} />}
      trailing={house ? undefined : <SyncBadge />}
    >
      <LargeTitle
        title={house ? t('voters.house', { no: house }) : t('voters.title')}
        subtitle={house ? t('voters.sameAddressSub', { count: ordered.length }) : undefined}
      />
      {!house && (
        <View style={s.controls}>
          <Pressable accessibilityRole="button" accessibilityLabel={`${t('common.booth', { no: booth })}, ${boothInfo?.name ?? ''}. ${t('common.change')}`} onPress={pickBooth} style={s.boothLink}>
            <AppText variant="callout" color={colors.accent}>{`${t('common.booth', { no: booth })} · ${boothInfo?.name ?? ''}`}</AppText>
            <Icon name="chevron-down" size={16} color={colors.accent} />
          </Pressable>
          <View style={s.search}>
            <Icon name="search" size={20} color={colors.textSecondary} />
            <TextInput
              value={q}
              onChangeText={setQ}
              autoFocus={params.focus === '1'}
              placeholder={t('voters.searchPh')}
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel={t('voters.searchPh')}
              style={s.input}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
          <SegmentedControl<ListView>
            value={view}
            onChange={setView}
            label={t('voters.houseWise')}
            options={[{ value: 'house', label: t('voters.houseWise') }, { value: 'serial', label: t('voters.serial') }]}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {task && <FilterChip label={task.name} onClear={() => setTaskId(null)} />}
            {presetLabel && <FilterChip label={presetLabel} onClear={() => setPreset(null)} />}
            {CHIPS.map((c) => {
              const on = chip === c;
              const label = c === 'all' ? t('voters.all') : c === 'todo' ? t('voters.notMet') : t(`groups.${c}`);
              return (
                <Pressable key={c} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={label} onPress={() => setChip(c)} style={[s.chip, on && s.chipOn]}>
                  <AppText variant="callout" weight="semibold" color={on ? colors.textOnAccent : colors.text}>
                    {label}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {!votersQ.data ? (
        <QueryState loading={votersQ.isLoading} error={votersQ.isError} onRetry={() => void votersQ.refetch()} />
      ) : items.length === 0 ? (
        <View style={s.empty}>
          <AppText variant="title2" align="center">{t('voters.empty')}</AppText>
          <AppText variant="callout" color={colors.textSecondary} align="center">{t('voters.emptyHint')}</AppText>
        </View>
      ) : (
        <FlashList
          // A new list for each search text: on the web, rows of the longer list can report their size after it shrank
          // ("index out of bounds" inside FlashList). Lists are short (one booth), so rebuilding is cheap.
          key={Platform.OS === 'web' ? `q:${q.trim()}` : 'list'}
          ref={listRef}
          data={items}
          extraData={openId}
          keyExtractor={(it) => it.key}
          getItemType={(it) => (it.kind === 'voter' && it.voter.id === openId ? 'open' : it.kind)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 96 }}
          renderItem={({ item }) =>
            item.kind === 'head' ? (
              <View style={s.houseBand}>
                <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}. ${item.badge}`} onPress={() => onSameAddress(item.house)} style={s.houseText}>
                  <AppText variant="title2" weight="bold">{item.title}</AppText>
                  <AppText variant="footnote" color={colors.textSecondary} numberOfLines={1}>{[item.badge, item.place].filter(Boolean).join(' · ')}</AppText>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`${t('voters.markHouse')} ${item.title}`} onPress={() => setMarkHouse(item)} style={s.markBtn} hitSlop={6}>
                  <AppText variant="footnote" weight="semibold" color={colors.accent}>{t('voters.markHouse')}</AppText>
                  <Icon name="chevron-down" size={14} color={colors.accent} />
                </Pressable>
              </View>
            ) : item.kind === 'gap' ? (
              <View style={{ height: spacing.md }} />
            ) : (
              <VoterRow
                voter={item.voter}
                open={item.voter.id === openId}
                first={item.first}
                last={item.last}
                onToggle={onToggle}
                onGroup={onGroup}
                onPatch={onPatch}
                showAddress={!(view === 'house' || house)}
              />
            )
          }
        />
      )}

      <Sheet visible={!!markHouse} title={markHouse ? t('voters.markHouseTitle', { house: markHouse.house, count: markHouse.voters.length }) : ''} onClose={() => setMarkHouse(null)} footer={t('voters.markHouseHint')}>
        {(['our', 'target', 'opp'] as GroupCode[]).map((g, i) => (
          <ChoiceRow key={g} title={t(`groups.${g}`)} selected={false} last={i === 2} onPress={() => markWholeHouse(g)} />
        ))}
      </Sheet>
      <Toast message={toast?.msg ?? null} onUndo={toast?.undo} onHide={() => setToast(null)} />
      <BoothSheet visible={boothSheet} onClose={() => setBoothSheet(false)} />
    </Screen>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}. ✕`} onPress={onClear} style={[s.chip, s.chipOn, { flexDirection: 'row', gap: 4 }]}>
      <AppText variant="callout" weight="semibold" color={colors.textOnAccent}>{label}</AppText>
      <Icon name="close" size={16} color={colors.textOnAccent} />
    </Pressable>
  );
}

const s = themed(() => StyleSheet.create({
  controls: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: 10 },
  boothLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', minHeight: 32 },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 44, paddingHorizontal: 10, borderRadius: radius.md, backgroundColor: colors.fill },
  input: { flex: 1, fontSize: 17, fontFamily: fonts.regular, color: colors.text },
  chips: { gap: spacing.sm, paddingRight: spacing.lg },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.accent },
  // spec voter-card C2: a strong band per house: number big, count + place, Mark house.
  houseBand: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: 6, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.accentTint },
  houseText: { flex: 1, minWidth: 0 },
  markBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 36, paddingHorizontal: 10, borderRadius: radius.full, backgroundColor: colors.surface },
  empty: { padding: 48, gap: 4 },
}));
