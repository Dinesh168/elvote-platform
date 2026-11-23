import { router } from 'expo-router';
import { CandidateBanner } from '@/features/customers/BrandPreview';
import { useFeature, useLook } from '@/features/session/customer';
import { useActiveMembership } from '@/stores/session';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TeamBanner } from '@/features/shell/TeamBanner';
import { TeamBar } from '@/features/shell/TeamBar';
import { SummaryCard } from '@/features/shell/SummaryCard';
import { ProgressCard } from '@/features/home/Progress';
import { Tips } from '@/features/home/Tips';
import { SyncBadge } from '@/features/sync/SyncBadge';
import type { GroupCode } from '@/api/types';
import {
  AppText, Button, ChoiceRow, Grid, Group, Icon, IconSquare, LargeTitle, Row, Screen, Sheet, SnoBadge,
} from '@/design/components';
import { colors, group, hairline, radius, spacing, web } from '@/design/tokens';
import { BoothSheet } from '@/features/common/BoothSheet';
import { QueryState } from '@/features/common/QueryState';
import { useBooths, useMe, useTasks, useVoters } from '@/features/data';
import { useNextVoter } from '@/features/home/useNextVoter';
import { selectBoothStats } from '@/features/stats/selectors';
import { ALL_VOTERS } from '@/features/voters/nextVoter';
import { longDate } from '@/lib/date';
import { useWide } from '@/design/layout';
import { usePrefs } from '@/stores/prefs';
import { relText } from '@/features/voters/rel';

const fmt = (n: number) => n.toLocaleString('en-IN');
const GROUPS: GroupCode[] = ['our', 'target', 'opp'];

export default function HomeScreen() {
  const wide = useWide();
  const look = useLook();
  const m = useActiveMembership();
  const tasksOn = useFeature('tasks');
  const surnamesOn = useFeature('surnames');
  const { t } = useTranslation();
  const booth = usePrefs((s) => s.booth);
  const pickedId = usePrefs((s) => s.pickedTaskId);
  const pick = usePrefs((s) => s.pickTask);
  const me = useMe().data;
  const boothInfo = useBooths().data?.find((b) => b.no === booth);
  const votersQ = useVoters(booth);
  const tasks = useTasks().data;
  const [sheet, setSheet] = useState<'booth' | 'task' | null>(null);

  const stats = useMemo(() => (votersQ.data ? selectBoothStats(votersQ.data, booth) : null), [votersQ.data, booth]);
  const next = useNextVoter(votersQ.data, tasks, booth, pickedId);

  const date = longDate();
  const firstName = me?.name.split(' ')[0] ?? '';
  const openVoters = (params: Record<string, string>) => router.push({ pathname: '/voters', params });
  const taskName = next?.task ? next.task.name : t('home.allVoters');

  return (
    <Screen header={<TeamBar trailing={<SyncBadge />} />} trailing={<SyncBadge />}>
      <TeamBanner />
      <Tips />
      <LargeTitle title={t('home.hello', { name: firstName })} subtitle={date} />
      {look?.candidateName && m ? (
        <View style={s.bannerWrap}>
          <CandidateBanner look={{ ...look, partyName: m.partyName }} />
          {look.message ? (
            <View style={s.msg} accessibilityRole="text">
              <Icon name="chatbubble-ellipses" size={18} color={colors.accent} />
              <AppText variant="callout" style={{ flex: 1 }}>{look.message}</AppText>
            </View>
          ) : null}
        </View>
      ) : null}

      {stats ? (
        // spec usability-r2 H1: one summary card like Polling day (ring, booth + Change, counts that open the list).
        <SummaryCard
          pct={stats.total ? (stats.met / stats.total) * 100 : 0}
          title={t('common.metOf', { met: fmt(stats.met), total: fmt(stats.total) })}
          subtitle={`${t('common.booth', { no: booth })} · ${boothInfo?.name ?? ''}`}
          action={t('common.change')}
          onAction={() => setSheet('booth')}
          actionA11y={`${t('common.booth', { no: booth })}, ${boothInfo?.name ?? ''}. ${t('common.metOf', { met: fmt(stats.met), total: fmt(stats.total) })}. ${t('common.change')}`}
          cells={[
            ...GROUPS.map((g) => ({ key: g, value: stats[g], label: t(`groups.${g}`), color: group[g].strong, onPress: () => openVoters({ chip: g }) })),
            { key: 'todo', value: stats.notMet, label: t('admin.notMet'), color: colors.text, onPress: () => openVoters({ chip: 'todo' }) },
          ]}
        />
      ) : (
        <Group style={{ marginTop: spacing.lg }}>
          <Row
            title={t('common.booth', { no: booth })}
            subtitle={boothInfo?.name}
            leading={<IconSquare name="location" bg={colors.accent} />}
            trailing={<AppText variant="body" color={colors.accent}>{t('common.change')}</AppText>}
            onPress={() => setSheet('booth')}
            last
            a11yLabel={`${t('common.booth', { no: booth })}, ${boothInfo?.name ?? ''}. ${t('common.change')}`}
          />
        </Group>
      )}

      <ProgressCard booth={booth} />

      {!stats ? (
        <QueryState loading={votersQ.isLoading} error={votersQ.isError} onRetry={() => void votersQ.refetch()} />
      ) : (
        <Grid cols={2}>
          <View>
          <Group
            header={t('home.nextVoter')}
            headerRight={
              <Pressable accessibilityRole="button" accessibilityLabel={`${t('home.whichWork')} ${taskName}`} onPress={() => setSheet('task')} style={s.taskBtn} hitSlop={8}>
                <AppText variant="callout" color={colors.accent} numberOfLines={1} style={{ maxWidth: 190 }}>
                  {taskName}
                </AppText>
                <Icon name="chevron-down" size={16} color={colors.accent} />
              </Pressable>
            }
            footer={next ? t(`home.why${next.why === 'all' ? 'All' : next.why === 'picked' ? 'Picked' : next.why === 'auto' ? 'Auto' : 'Due'}`) : undefined}
          >
            {next?.voter ? (
              <View style={s.next}>
                <View style={s.nextRow}>
                  <SnoBadge sno={next.voter.sno} size={52} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="headline" style={{ fontSize: 19, lineHeight: 24 }}>
                      {next.voter.name}
                    </AppText>
                    <AppText variant="callout" color={colors.textSecondary}>
                      {`${relText(t, next.voter.relation)} ${next.voter.relative} · ${next.voter.age} · ${t('voters.houseShort', { house: next.voter.house })}`}
                    </AppText>
                  </View>
                </View>
                <Button label={t('home.start')} onPress={() => openVoters({ open: next.voter!.id, ...(next.task ? { task: next.task.id } : {}) })} />
              </View>
            ) : (
              <View style={s.next}>
                <AppText variant="body">{t('home.allDone')}</AppText>
              </View>
            )}
          </Group>

          <Pressable accessibilityRole="search" accessibilityLabel={t('home.search')} onPress={() => openVoters({ focus: '1' })} style={[s.search, wide && s.searchWide]}>
            <Icon name="search" size={20} color={colors.textSecondary} />
            <AppText variant="body" color={colors.textSecondary}>
              {t('home.search')}
            </AppText>
          </Pressable>

          </View>

          <View>
          <Group header={t('home.moreNumbers')}>
            <Row title={t('stats.mobile')} value={fmt(stats.withMobile)} leading={<IconSquare name="phone-portrait-outline" bg={colors.iconMobile} />} chevron onPress={() => router.push('/stats/mobile')} />
            <Row title={t('stats.houses')} value={fmt(stats.houses)} leading={<IconSquare name="home" bg={colors.iconHouse} />} chevron onPress={() => router.push('/stats/houses')} />
            <Row title={t('stats.age')} leading={<IconSquare name="calendar-outline" bg={colors.iconAge} />} chevron onPress={() => router.push('/stats/age')} />
            <Row title={t('stats.gender')} leading={<IconSquare name="people" bg={colors.iconGender} />} chevron onPress={() => router.push('/stats/gender')} last={!surnamesOn} />
            {surnamesOn ? <Row title={t('home2.surnames')} leading={<IconSquare name="people-circle" bg={colors.accent} />} chevron onPress={() => router.push('/surnames')} last /> : null}
          </Group>

          {tasksOn ? (
          <Group header={t('home.tasks')}>
            {(next?.options ?? []).filter((o) => o.task).map((o, i, arr) => (
              <Row
                key={o.id}
                title={o.task!.name}
                value={`${o.progress.done} / ${o.progress.of}`}
                leading={<IconSquare name="checkmark-done" bg={colors.iconTask} />}
                chevron
                onPress={() => openVoters({ task: o.id, chip: 'todo' })}
              />
            ))}
            <Row title={t('home2.allTasks')} leading={<IconSquare name="list" bg={colors.iconTask} />} chevron onPress={() => router.push('/tasks')} last />
          </Group>
          ) : null}
          </View>
        </Grid>
      )}

      <BoothSheet
        visible={sheet === 'booth'}
        onClose={() => setSheet(null)}
        subtitleFor={(no) => (no === booth && stats ? t('common.metOf', { met: fmt(stats.met), total: fmt(stats.total) }) : undefined)}
      />
      <Sheet visible={sheet === 'task'} title={t('home.whichWork')} onClose={() => setSheet(null)} footer={t('home.taskFoot')}>
        {(next?.options ?? []).map((o, i, arr) => {
          const selected = o.id === (next?.task?.id ?? ALL_VOTERS);
          const sub = [t('home.taskDone', { done: fmt(o.progress.done), of: fmt(o.progress.of) }), o.task ? t('home.due', { date: o.task.dueDate.slice(5).split('-').reverse().join('/') }) : null, o.task?.lastWorkedAt ? t('home.lastWorked') : null]
            .filter(Boolean)
            .join(' · ');
          return (
            <ChoiceRow
              key={o.id}
              title={o.task ? o.task.name : t('home.allVoters')}
              subtitle={sub}
              selected={selected}
              last={i === arr.length - 1}
              onPress={() => {
                pick(o.id);
                setSheet(null);
              }}
            />
          );
        })}
      </Sheet>
    </Screen>
  );
}

const s = StyleSheet.create({
  taskBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  next: { padding: spacing.lg, gap: 14 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  searchWide: { backgroundColor: colors.surface, borderWidth: 1, borderColor: web.border },
  bannerWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.sm },
  msg: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 44, marginHorizontal: spacing.lg, marginTop: spacing.xl, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.fill },
  work: { padding: spacing.lg, gap: 10 },
  workTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  groups: { flexDirection: 'row' },
  groupCell: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  groupDivider: { borderRightWidth: hairline, borderRightColor: colors.separator },
});
