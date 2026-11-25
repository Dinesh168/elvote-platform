/**
 * spec easy-redesign V3: Voters | Houses list with search, Filter, Sort, removable chips and a result line. Used as
 * the Voters tab (root) and, with a Back + path bar, when Home opens a shortcut (pushed: Back returns to Home as it was).
 */
import { FlashList } from '@shopify/flash-list';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { GroupCode, Task, Voter } from '@/api/types';
import {
  ActivePills, AppText, ChipRow, ChoiceRow, FilterSheet, Icon, PathBar, Screen, SearchBox, SectionBand, Sheet, Toast, ToolRow,
  type ChipItem, type FilterCat,
} from '@/design/components';
import { themed } from '@/design/theme';
import { colors, easy, group, radius, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { keys, queryClient, saveVoter, useTasks, useVoters, type SaveHandle } from '@/features/data';
import { TeamBar } from '@/features/shell/TeamBar';
import { goBack } from '@/features/shell/navHistory';
import { SyncBadge } from '@/features/sync/SyncBadge';
import { matchesTask } from '@/features/voters/nextVoter';
import { VoterRow } from '@/features/voters/VoterRow';
import { usePrefs } from '@/stores/prefs';
import {
  activeKeys, houseList, matchVoter, searchVoter, sortHouses, sortVoters, toggleFilter, withoutKey,
  type HouseColour, type HouseSort, type VoterFilters, type VoterSort, VOTER_SORTS,
} from './logic';
import { filterTitle, filterWord, filtersFromParams, houseWord, sectionKey, sectionLabel, sortWord } from './labels';
import { inWhere, useWhereFor, WhereBar } from './WhereBar';

type Item =
  | { kind: 'band'; key: string; label: string; count: number }
  | { kind: 'voter'; key: string; voter: Voter }
  | { kind: 'house'; key: string; house: ReturnType<typeof houseList>[number] };

const HOUSE_TONE: Record<HouseColour, { bg: string; bd: string; ic: string; icFg: string }> = {
  our: { bg: group.our.card, bd: group.our.strong, ic: group.our.strong, icFg: colors.textOnAccent },
  target: { bg: group.target.card, bd: group.target.strong, ic: group.target.strong, icFg: colors.textOnAccent },
  opp: { bg: group.opp.card, bd: group.opp.strong, ic: group.opp.strong, icFg: colors.textOnAccent },
  left: { bg: colors.surface, bd: easy.dashed, ic: colors.pressed, icFg: group.none.text },
};

export function VoterListScreen({ pushed, housePath, admin }: { pushed?: boolean; housePath: string; admin?: boolean }) {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ f?: string; chip?: string; preset?: string; mode?: string; hc?: string; open?: string; task?: string; q?: string; from?: string; booth?: string; sec?: string }>();
  const myBooth = usePrefs((s) => s.booth);
  // Admin pages name the booth (and section) in the route; volunteers use their picked booth.
  const booth = admin && Number(params.booth) > 0 ? Number(params.booth) : myBooth;
  const votersQ = useVoters(booth);
  const tasks = useTasks().data;
  const whereV = useWhereFor(booth);
  const where = admin ? { sec: params.sec ?? null, house: null } : whereV;

  const [mode, setMode] = useState<'voters' | 'houses'>(params.mode === 'houses' ? 'houses' : 'voters');
  const [f, setF] = useState<VoterFilters>(() => filtersFromParams(params));
  const [hc, setHc] = useState<HouseColour | 'all'>((params.hc as HouseColour) || 'all');
  const [sort, setSort] = useState<VoterSort>('sno');
  const [hsort, setHsort] = useState<HouseSort>('house');
  const [q, setQ] = useState(params.q ?? '');
  const [openId, setOpenId] = useState<string | null>(params.open ?? null);
  const [taskId, setTaskId] = useState<string | null>(params.task ?? null);
  const [sheet, setSheet] = useState<'filter' | 'sort' | null>(null);
  const [toast, setToast] = useState<{ msg: string; undo: () => void } | null>(null);
  const task: Task | null = useMemo(() => tasks?.find((x) => x.id === taskId) ?? null, [tasks, taskId]);

  // A new link (shortcut) on the root Voters tab sets fresh filters.
  const paramKey = JSON.stringify(params);
  useEffect(() => {
    if (pushed) return;
    /* eslint-disable react-hooks/set-state-in-effect -- a navigation (new params) resets the filters on purpose */
    setF(filtersFromParams(params));
    setMode(params.mode === 'houses' ? 'houses' : 'voters');
    setHc((params.hc as HouseColour) || 'all');
    setTaskId(params.task ?? null);
    setQ(params.q ?? '');
    if (params.open) setOpenId(params.open);
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramKey]);

  const scoped = useMemo(() => (votersQ.data ?? []).filter((v) => v.booth === booth && inWhere(v, where) && matchesTask(v, task)), [votersQ.data, booth, where, task]);
  const noGrp = useMemo(() => withoutKey(f, 'grp'), [f]);
  const voters = useMemo(() => sortVoters(scoped.filter((v) => matchVoter(v, f) && searchVoter(v, q)), sort), [scoped, f, q, sort]);
  const houses = useMemo(() => {
    const all = houseList(scoped).filter((h) => (hc === 'all' || h.colour === hc) && (!q.trim() || h.house.toLowerCase().startsWith(q.trim().toLowerCase()) || h.head.name.toLowerCase().includes(q.trim().toLowerCase())));
    return sortHouses(all, hsort);
  }, [scoped, hc, q, hsort]);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    if (mode === 'houses') {
      for (const h of houses) out.push({ kind: 'house', key: `h-${h.house}`, house: h });
      return out;
    }
    if (sort === 'sno' || sort === 'house') {
      let cur: string | null = null;
      const counts = new Map<string, number>();
      for (const v of voters) counts.set(sectionKey(v), (counts.get(sectionKey(v)) ?? 0) + 1);
      for (const v of voters) {
        if (sectionKey(v) !== cur) { cur = sectionKey(v); out.push({ kind: 'band', key: `b-${cur}`, label: sectionLabel(t, v), count: counts.get(cur) ?? 0 }); }
        out.push({ kind: 'voter', key: v.id, voter: v });
      }
    } else for (const v of voters) out.push({ kind: 'voter', key: v.id, voter: v });
    return out;
  }, [mode, houses, voters, sort, t]);

  const onGroup = useCallback((v: Voter, g: GroupCode) => {
    const handle: SaveHandle = saveVoter(v, { group: g });
    if (taskId) queryClient.setQueryData<Task[]>(keys.tasks, (old) => old?.map((x) => (x.id === taskId ? { ...x, lastWorkedAt: new Date().toISOString() } : x)));
    setToast({ msg: t('voters.saved', { name: v.name, group: t(`groups.${g}`) }), undo: () => { handle.undo(); setToast(null); } });
  }, [t, taskId]);
  const onPatch = useCallback((v: Voter, patch: Partial<Voter>) => { saveVoter(v, patch); }, []);
  const onToggle = useCallback((id: string) => setOpenId((cur) => (cur === id ? null : id)), []);

  // ---------- chips / filters ----------
  const cnt = (x: VoterFilters) => scoped.filter((v) => matchVoter(v, x)).length;
  const grpChips: ChipItem[] = [
    { key: 'all', label: t('easy.all'), icon: 'people', count: cnt(noGrp), selected: !f.grp, onPress: () => setF(noGrp) },
    ...(['our', 'target', 'opp'] as GroupCode[]).map((g) => ({ key: g, label: t(`groups.${g}`), icon: g === 'our' ? 'thumbs-up' : g === 'target' ? 'swap-horizontal' : 'thumbs-down', count: cnt({ ...noGrp, grp: g }), selected: f.grp === g, tone: g, onPress: () => setF({ ...noGrp, grp: g }) })),
    { key: 'none', label: t('groups.none'), icon: 'help-circle', count: cnt({ ...noGrp, grp: 'none' }), selected: f.grp === 'none', tone: 'grey' as const, onPress: () => setF({ ...noGrp, grp: 'none' }) },
  ];
  const hs = houseList(scoped);
  const houseChips: ChipItem[] = (['all', 'left', 'our', 'target', 'opp'] as const).map((c) => ({
    key: c, label: houseWord(t, c), icon: c === 'left' ? 'enter-outline' : 'home', count: c === 'all' ? hs.length : hs.filter((h) => h.colour === c).length,
    selected: hc === c, tone: c === 'all' ? undefined : c === 'left' ? ('grey' as const) : c, onPress: () => setHc(c),
  }));
  const pills = mode === 'voters'
    ? activeKeys(f).filter((k) => k !== 'grp').map((k) => ({ label: filterWord(t, k, String(f[k])), onRemove: () => setF(withoutKey(f, k)) }))
    : [];
  if (task) pills.unshift({ label: task.name, onRemove: () => setTaskId(null) });
  const opt = (k: keyof VoterFilters, vals: string[]) => vals.map((val) => ({
    key: val, label: filterWord(t, k, val), count: cnt({ ...f, [k]: val } as VoterFilters), selected: f[k] === val, onPress: () => setF(toggleFilter(f, k, val)),
  }));
  const cats: FilterCat[] = mode === 'voters' ? [
    { title: t('easy.cat.group'), icon: 'thumbs-up', opts: opt('grp', ['our', 'target', 'opp', 'none']) },
    { title: t('easy.cat.phone'), icon: 'call', opts: opt('mobile', ['with', 'without']) },
    { title: t('easy.cat.age'), icon: 'person', opts: opt('age', ['a1', 'a2', 'a3', 'a4']) },
    { title: t('easy.cat.sex'), icon: 'people', opts: opt('sex', ['M', 'F', 'T']) },
    { title: t('easy.cat.living'), icon: 'walk', opts: opt('res', ['here', 'moved', 'died', 'not_found']) },
    { title: t('easy.cat.poll'), icon: 'checkbox', opts: [...opt('help', ['yes']), ...opt('voted', ['yes', 'no'])] },
  ] : [
    { title: t('easy.cat.houseColour'), icon: 'home', opts: (['our', 'target', 'opp', 'left'] as HouseColour[]).map((c) => ({ key: c, label: houseWord(t, c), count: hs.filter((h) => h.colour === c).length, selected: hc === c, onPress: () => setHc(hc === c ? 'all' : c) })) },
  ];
  const fCount = mode === 'voters' ? activeKeys(f).length : hc === 'all' ? 0 : 1;
  const title = mode === 'houses' ? houseWord(t, hc) : filterTitle(t, f);
  const resultLine = mode === 'houses' ? t('easy.nHouses', { n: houses.length }) : t('easy.nVoters', { n: voters.length });

  const header = (
    <View style={s.headerBox}>
      <ChipRow chips={mode === 'voters' ? grpChips : houseChips} />
      <ActivePills pills={pills} onClear={() => { setF({}); setHc('all'); setTaskId(null); setQ(''); }} />
      <AppText variant="callout" weight="bold" color={colors.textSecondary}>{resultLine}</AppText>
    </View>
  );

  return (
    <Screen width="medium" scroll={false} header={pushed ? undefined : <TeamBar trailing={<SyncBadge />} say={t('easy.say.list')} />} trailing={pushed ? undefined : <SyncBadge />}>
      {pushed ? (
        <PathBar back={params.from || t('tabs.home')} onBack={goBack} crumbs={[{ label: params.from || t('tabs.home'), onPress: goBack }, { label: title }]} />
      ) : null}
      <View style={s.top}>
        {!pushed ? <WhereBar voters={(votersQ.data ?? []).filter((v) => v.booth === booth)} /> : null}
        <View style={s.modes}>
          {(['voters', 'houses'] as const).map((md) => {
            const on = mode === md;
            return (
              <Pressable key={md} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setMode(md)} style={({ pressed }) => [s.mode, on && s.modeOn, pressed && { opacity: 0.8 }]}>
                <Icon name={md === 'voters' ? 'people' : 'home'} size={22} color={on ? colors.textOnAccent : easy.active} />
                <AppText variant="body" weight="bold" color={on ? colors.textOnAccent : easy.active}>{md === 'voters' ? t('easy.voters') : t('easy.housesTitle')}</AppText>
                {on ? <Icon name="checkmark" size={18} color={colors.textOnAccent} /> : null}
              </Pressable>
            );
          })}
        </View>
        <SearchBox value={q} onChange={setQ} placeholder={mode === 'houses' ? t('easy.searchHouse') : t('easy.searchVoter')} />
        <ToolRow filterCount={fCount} onFilter={() => setSheet('filter')} sortWord={mode === 'houses' ? t(`easy.hsort.${hsort}`) : sortWord(t, sort)} onSort={() => setSheet('sort')} />
      </View>

      {!votersQ.data ? (
        <QueryState loading={votersQ.isLoading} error={votersQ.isError} onRetry={() => void votersQ.refetch()} />
      ) : (
        <FlashList
          key={Platform.OS === 'web' ? `${mode}:${q.trim()}:${JSON.stringify(f)}:${hc}` : mode}
          data={items}
          extraData={openId}
          keyExtractor={(it) => it.key}
          getItemType={(it) => (it.kind === 'voter' && it.voter.id === openId ? 'open' : it.kind)}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={header}
          ListEmptyComponent={
            <View style={s.empty}>
              <Icon name="search" size={40} color={colors.textSecondary} />
              <AppText variant="title2" align="center">{t('voters.empty')}</AppText>
              <Pressable accessibilityRole="button" onPress={() => { setF({}); setHc('all'); setQ(''); }} style={s.showAll}><AppText variant="body" weight="bold" color={colors.textOnAccent}>{t('easy.showAll')}</AppText></Pressable>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 96 }}
          renderItem={({ item }) =>
            item.kind === 'band' ? (
              <SectionBand label={item.label} count={String(item.count)} />
            ) : item.kind === 'voter' ? (
              <View style={{ paddingTop: spacing.md }}>
                <VoterRow voter={item.voter} open={item.voter.id === openId} onToggle={onToggle} onGroup={onGroup} onPatch={onPatch} />
              </View>
            ) : (
              <HouseBox h={item.house} onPress={() => router.push({ pathname: housePath as never, params: { no: item.house.house, from: title, ...(admin ? { booth: String(booth) } : {}) } })} />
            )
          }
        />
      )}

      <FilterSheet visible={sheet === 'filter'} onClose={() => setSheet(null)} cats={cats} onClear={() => { setF({}); setHc('all'); }}
        showLabel={mode === 'houses' ? t('easy.showN', { n: houses.length }) : t('easy.showN', { n: voters.length })} />
      <Sheet visible={sheet === 'sort'} title={t('easy.sort')} onClose={() => setSheet(null)}>
        {mode === 'voters'
          ? VOTER_SORTS.map((x, i) => <ChoiceRow key={x} title={sortWord(t, x)} selected={sort === x} last={i === VOTER_SORTS.length - 1} onPress={() => { setSort(x); setSheet(null); }} />)
          : (['house', 'most', 'left'] as HouseSort[]).map((x, i) => <ChoiceRow key={x} title={t(`easy.hsort.${x}`)} selected={hsort === x} last={i === 2} onPress={() => { setHsort(x); setSheet(null); }} />)}
      </Sheet>
      <Toast message={toast?.msg ?? null} onUndo={toast?.undo} onHide={() => setToast(null)} />
    </Screen>
  );
}

/** A house: number, family, address, one square per member in their group colour, "2 of 4 met". */
export function HouseBox({ h, onPress }: { h: ReturnType<typeof houseList>[number]; onPress: () => void }) {
  const { t } = useTranslation();
  const tone = HOUSE_TONE[h.colour];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${t('easy.houseNo', { no: h.house })}, ${houseWord(t, h.colour)}, ${t('easy.metOf', { met: h.met, n: h.size })}`} onPress={onPress}
      style={({ pressed }) => [s.house, { backgroundColor: tone.bg, borderColor: tone.bd, borderStyle: h.colour === 'left' ? 'dashed' : 'solid' }, pressed && { opacity: 0.8 }]}>
      <View style={[s.houseNo, { backgroundColor: tone.ic }]}>
        <Icon name="home" size={20} color={tone.icFg} />
        <AppText variant="headline" weight="bold" color={tone.icFg} numberOfLines={1}>{h.house}</AppText>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <AppText variant="headline" numberOfLines={1}>{t('easy.family', { name: h.head.name })}</AppText>
        {h.head.village ? <AppText variant="footnote" color={colors.textSecondary} numberOfLines={1}>{h.head.village}</AppText> : null}
        <View style={s.squares}>
          {h.voters.slice(0, 10).map((v) => (
            <View key={v.id} style={[s.sq, { backgroundColor: v.group ? group[v.group].strong : colors.surface, borderColor: v.group ? group[v.group].strong : easy.dashed }]} />
          ))}
          <AppText variant="footnote" weight="bold" color={colors.textSecondary}>{t('easy.metOf', { met: h.met, n: h.size })}</AppText>
        </View>
      </View>
      <Icon name="chevron-forward" size={22} color={colors.textSecondary} />
    </Pressable>
  );
}

const s = themed(() => StyleSheet.create({
  top: { gap: 10, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  modes: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  mode: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 54, borderRadius: 16, borderWidth: 2, borderColor: easy.active, backgroundColor: colors.surface },
  modeOn: { backgroundColor: easy.active },
  headerBox: { gap: 10, paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  empty: { padding: 40, gap: 10, alignItems: 'center' },
  showAll: { minHeight: 52, paddingHorizontal: 22, borderRadius: 16, backgroundColor: easy.active, alignItems: 'center', justifyContent: 'center' },
  house: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, borderRadius: 20, borderWidth: 2.5 },
  houseNo: { width: 64, minHeight: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  squares: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  sq: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5 },
  // `radius` kept for future cards
  _r: { borderRadius: radius.md },
}));
