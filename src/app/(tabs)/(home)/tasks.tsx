import { router } from 'expo-router';
import { themed } from '@/design/theme';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Group, Icon, LargeTitle, ProgressBar, Screen, SegmentedControl } from '@/design/components';
import { colors, hairline, radius, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { useTasks, useVoters } from '@/features/data';
import { taskStatus, type TaskStatus } from '@/features/tasks/status';
import { nextVoter, taskProgress } from '@/features/voters/nextVoter';
import { usePrefs } from '@/stores/prefs';

type Filter = 'all' | 'ongoing' | 'completed';
const fmt = (n: number) => n.toLocaleString('en-IN');

/** V-TASK-1: tasks from the admin with targeted vs completed for this booth; tap → voters with the next one open. */
export default function Tasks() {
  const { t } = useTranslation();
  const booth = usePrefs((s) => s.booth);
  const tasksQ = useTasks();
  const votersQ = useVoters(booth);
  const [filter, setFilter] = useState<Filter>('all');
  const today = new Date().toISOString().slice(0, 10);

  const rows = useMemo(() => {
    const voters = votersQ.data ?? [];
    return (tasksQ.data ?? [])
      .filter((x) => x.booths.includes(booth))
      .map((task) => ({ task, ...taskStatus(task, today), progress: taskProgress(voters, booth, task), next: nextVoter(voters, booth, task) }))
      .filter((r) => filter === 'all' || (filter === 'ongoing' ? r.status !== 'completed' : r.status === 'completed'));
  }, [tasksQ.data, votersQ.data, booth, filter, today]);

  const name = (k?: string, n?: string) => (k && k !== 'other' ? t(`admin.kinds.${k}`) : n ?? '');
  const badge = (st: TaskStatus) => (st === 'ongoing' ? colors.accent : colors.textSecondary);

  return (
    <Screen width="medium" back={t('tabs.home')}>
      <LargeTitle title={t('tasks.title')} subtitle={t('tasks.sub', { no: booth })} />
      <View style={s.seg}>
        <SegmentedControl<Filter> label={t('tasks.title')} value={filter} onChange={setFilter}
          options={[{ value: 'all', label: t('tasks.all') }, { value: 'ongoing', label: t('admin.status.ongoing') }, { value: 'completed', label: t('admin.status.completed') }]} />
      </View>
      {!tasksQ.data || !votersQ.data ? (
        <QueryState loading={tasksQ.isLoading || votersQ.isLoading} error={tasksQ.isError || votersQ.isError} onRetry={() => { void tasksQ.refetch(); void votersQ.refetch(); }} />
      ) : rows.length === 0 ? (
        <AppText variant="callout" color={colors.textSecondary} align="center" style={s.empty}>{t('tasks.empty')}</AppText>
      ) : (
        <Group>
          {rows.map((r, i) => {
            const pct = r.progress.of ? Math.round((r.progress.done / r.progress.of) * 100) : 0;
            return (
              <Pressable
                key={r.task.id}
                accessibilityRole="button"
                accessibilityLabel={`${name(r.task.kind, r.task.name)}, ${pct}%, ${t(`admin.status.${r.status}`)}`}
                onPress={() => router.push({ pathname: '/voters', params: { task: r.task.id, ...(r.next ? { open: r.next.id } : {}) } })}
                style={({ pressed }) => [s.row, i < rows.length - 1 && s.divider, pressed && { backgroundColor: colors.pressed }]}
              >
                <View style={s.head}>
                  <AppText variant="headline" style={s.flex}>{name(r.task.kind, r.task.name)}</AppText>
                  <View style={[s.badge, r.status === 'ongoing' && s.badgeOn]}>
                    <AppText variant="caption" weight="semibold" color={badge(r.status)}>{t(`admin.status.${r.status}`)}</AppText>
                  </View>
                  <Icon name="chevron-forward" size={18} color={colors.chevron} />
                </View>
                <AppText variant="callout" color={colors.textSecondary}>
                  {`${r.task.startDate ? t('tasks.dates', { start: r.task.startDate, end: r.task.dueDate }) : r.task.dueDate}${r.status === 'ongoing' ? ` · ${t('admin.daysLeft', { n: r.daysLeft })}` : ''}`}
                </AppText>
                <ProgressBar value={r.progress.of ? r.progress.done / r.progress.of : 0} />
                <AppText variant="callout" tabular>{`${t('admin.targetedDone', { completed: fmt(r.progress.done), targeted: fmt(r.progress.of) })} · ${pct}%`}</AppText>
              </Pressable>
            );
          })}
        </Group>
      )}
    </Screen>
  );
}

const s = themed(() => StyleSheet.create({
  seg: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  empty: { padding: spacing.xxl },
  row: { padding: spacing.lg, gap: 6, backgroundColor: colors.surface },
  divider: { borderBottomWidth: hairline, borderBottomColor: colors.separator },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, backgroundColor: colors.fill },
  badgeOn: { backgroundColor: colors.accentTint },
}));
