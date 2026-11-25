/**
 * Volunteer Home (spec easy-redesign V2): one big "Go to a house" button, "Open last house", the where bar and the
 * shortcut numbers in groups (Voters, Houses, Phone numbers, People, Not living here). Every number opens its list.
 */
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Group, Icon, IconSquare, Row, Screen, ShortcutTile, TileGroup } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, easy, spacing } from '@/design/tokens';
import { CandidateBanner } from '@/features/customers/BrandPreview';
import { QueryState } from '@/features/common/QueryState';
import { useVoters } from '@/features/data';
import { HOUSE_SHORTCUT, SHORTCUT_FILTER, shortcutCounts, type ShortcutKey } from '@/features/easy/logic';
import { useLastHouse } from '@/features/easy/lastHouse';
import { inWhere, useWhereFor, WhereBar } from '@/features/easy/WhereBar';
import { ProgressCard } from '@/features/home/Progress';
import { Tips } from '@/features/home/Tips';
import { useFeature, useLook } from '@/features/session/customer';
import { TeamBar } from '@/features/shell/TeamBar';
import { SyncBadge } from '@/features/sync/SyncBadge';
import { usePrefs } from '@/stores/prefs';
import { useActiveMembership } from '@/stores/session';

const fmt = (n: number) => n.toLocaleString('en-IN');

export default function HomeScreen() {
  const { t } = useTranslation();
  const look = useLook();
  const m = useActiveMembership();
  const tasksOn = useFeature('tasks');
  const surnamesOn = useFeature('surnames');
  const booth = usePrefs((s) => s.booth);
  const votersQ = useVoters(booth);
  const where = useWhereFor(booth);
  const lastHouse = useLastHouse((s) => s.byBooth[booth]);
  const all = useMemo(() => (votersQ.data ?? []).filter((v) => v.booth === booth), [votersQ.data, booth]);
  const scoped = useMemo(() => all.filter((v) => inWhere(v, where)), [all, where]);
  const c = useMemo(() => shortcutCounts(scoped), [scoped]);
  const from = t('tabs.home');

  const open = (k: ShortcutKey) => {
    const hc = HOUSE_SHORTCUT[k];
    if (hc) router.push({ pathname: '/h-list', params: { mode: 'houses', hc, from } });
    else router.push({ pathname: '/h-list', params: { f: JSON.stringify(SHORTCUT_FILTER[k] ?? {}), from } });
  };
  const tile = (k: ShortcutKey, icon: string, word: string, tone?: 'our' | 'target' | 'opp' | 'grey' | 'blue', big?: boolean) => (
    <ShortcutTile key={k} icon={icon} num={fmt(c[k] ?? 0)} word={word} tone={tone} big={big} onPress={() => open(k)} />
  );

  return (
    <Screen header={<TeamBar trailing={<SyncBadge />} say={t('easy.say.home')} />} trailing={<SyncBadge />}>
      <Tips />
      <WhereBar voters={all} />
      <ProgressCard booth={booth} />

      <View style={s.actions}>
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/h-list', params: { mode: 'houses', from } })} style={({ pressed }) => [s.big, pressed && { opacity: 0.85 }]}>
          <Icon name="home" size={32} color={colors.textOnAccent} />
          <AppText variant="title2" weight="bold" color={colors.textOnAccent}>{t('easy.goToHouse')}</AppText>
        </Pressable>
        {lastHouse ? (
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/h-house', params: { no: lastHouse, from } })} style={({ pressed }) => [s.last, pressed && { opacity: 0.8 }]}>
            <Icon name="arrow-undo" size={22} color={easy.active} />
            <AppText variant="body" weight="bold" color={easy.active}>{t('easy.lastHouse', { no: lastHouse })}</AppText>
          </Pressable>
        ) : null}
      </View>

      {!votersQ.data ? (
        <QueryState loading={votersQ.isLoading} error={votersQ.isError} onRetry={() => void votersQ.refetch()} />
      ) : (
        <>
          <View style={s.wide}>
            <ShortcutTile icon="people" num={fmt(c.all)} word={t('easy.allVoters')} onPress={() => open('all')} big />
          </View>
          <TileGroup title={t('easy.voters')} icon="people" cols={2}>
            {[tile('our', 'thumbs-up', t('easy.oursVoters'), 'our', true), tile('target', 'swap-horizontal', t('easy.swingVoters'), 'target', true),
              tile('opp', 'thumbs-down', t('groups.opp'), 'opp', true), tile('none', 'help-circle', t('groups.none'), 'grey', true)]}
          </TileGroup>
          <TileGroup title={t('easy.housesTitle')} icon="home">
            {[tile('houses', 'home', t('easy.allHouses')), tile('ourHouses', 'home', t('easy.houses.our'), 'our'), tile('targetHouses', 'home', t('easy.houses.target'), 'target'),
              tile('oppHouses', 'home', t('easy.houses.opp'), 'opp'), tile('leftHouses', 'enter-outline', t('easy.notVisited'), 'grey')]}
          </TileGroup>
          <TileGroup title={t('easy.phones')} icon="call">
            {[tile('withPhone', 'call', t('easy.f.withPhone')), tile('noPhone', 'call-outline', t('easy.f.noPhone'), 'grey'), tile('ourWithPhone', 'call', t('easy.ourWithPhone'), 'our')]}
          </TileGroup>
          <TileGroup title={t('easy.people')} icon="person">
            {[tile('a1', 'star', t('easy.f.a1')), tile('a2', 'person', t('easy.f.a2')), tile('a3', 'person', t('easy.f.a3')), tile('a4', 'person', t('easy.f.a4')),
              tile('men', 'man', t('easy.f.sexM')), tile('women', 'woman', t('easy.f.sexF')), tile('help', 'accessibility', t('easy.needsHelp'))]}
          </TileGroup>
          <TileGroup title={t('easy.notLiving')} icon="walk">
            {[tile('moved', 'walk', t('voters.res.moved'), 'grey'), tile('died', 'person-remove', t('voters.res.died'), 'grey'), tile('notFound', 'help-buoy', t('voters.res.not_found'), 'grey')]}
          </TileGroup>
        </>
      )}

      {look?.candidateName && m ? (
        <View style={s.bannerWrap}><CandidateBanner look={{ ...look, partyName: m.partyName }} /></View>
      ) : null}

      {tasksOn || surnamesOn ? (
        <Group style={{ marginTop: spacing.lg }}>
          {tasksOn ? <Row title={t('home2.allTasks')} leading={<IconSquare name="flag" bg={colors.iconTask} />} chevron onPress={() => router.push('/tasks')} last={!surnamesOn} /> : null}
          {surnamesOn ? <Row title={t('home2.surnames')} leading={<IconSquare name="people-circle" bg={colors.accent} />} chevron onPress={() => router.push('/surnames')} last /> : null}
        </Group>
      ) : null}
    </Screen>
  );
}

const s = themed(() => StyleSheet.create({
  actions: { paddingHorizontal: spacing.lg, gap: spacing.sm, marginTop: spacing.md },
  big: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 76, borderRadius: 20, backgroundColor: easy.active },
  last: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 54, borderRadius: 16, borderWidth: 1.5, borderColor: easy.tileBorder, backgroundColor: colors.surface },
  wide: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  bannerWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
}));
