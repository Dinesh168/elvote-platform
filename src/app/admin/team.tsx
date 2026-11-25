import { useQuery, useQueryClient } from '@tanstack/react-query';
import { themed } from '@/design/theme';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { adminApi, type TeamMember } from '@/api/adminApi';
import { AppText, Button, ChipRow, ChoiceRow, DataTable, Field, Group, LargeTitle, Row, Screen, SegmentedControl, Sheet, ToolRow, type Column } from '@/design/components';
import { useWide } from '@/design/layout';
import { colors, radius, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { useActiveMembership } from '@/stores/session';
import { TeamBar } from '@/features/shell/TeamBar';
import { SyncBadge } from '@/features/sync/SyncBadge';

type Tab = 'pending' | 'approved' | 'rejected';

/** “5 min ago” style time (for last sync). */
function ago(iso: string): string {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (m < 1) return 'now';
  if (m < 60) return `${m} min`;
  if (m < 48 * 60) return `${Math.round(m / 60)} h`;
  return `${Math.round(m / 1440)} d`;
}

/** A-TEAM-1/2: volunteers list and approvals (confirm or edit booths → Approve / Reject with reason). */
export default function Team() {
  const { t } = useTranslation();
  const m = useActiveMembership();
  const mid = m?.id ?? '';
  const qc = useQueryClient();
  // spec easy-redesign A7: opened from a booth's numbers → that booth's approved volunteers.
  const { booth: boothParam } = useLocalSearchParams<{ booth?: string }>();
  const boothNo = Number(boothParam) > 0 ? Number(boothParam) : null;
  const [tab, setTab] = useState<Tab>(boothNo ? 'approved' : 'pending');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'today' | 'least' | 'name' | 'booth'>('today');
  const [act, setAct] = useState<'all' | 'out' | 'quiet'>('all');
  const [sortSheet, setSortSheet] = useState(false);
  const [open, setOpen] = useState<TeamMember | null>(null);
  const q = useQuery({ queryKey: ['team', mid, tab, search], queryFn: () => adminApi.team(mid, tab, search || undefined), enabled: !!mid });
  const pendingQ = useQuery({ queryKey: ['team', mid, 'pending', ''], queryFn: () => adminApi.team(mid, 'pending'), enabled: !!mid });
  const pendingN = pendingQ.data?.length ?? 0;
  const rows = (q.data ?? [])
    .filter((p) => (!boothNo || p.booths.includes(boothNo)) && (tab !== 'approved' || act === 'all' || (act === 'out' ? p.contactedToday > 0 : p.contactedToday === 0)))
    .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : sort === 'booth' ? (a.booths[0] ?? 0) - (b.booths[0] ?? 0) : sort === 'least' ? a.contactedTotal - b.contactedTotal : b.contactedToday - a.contactedToday || b.contactedTotal - a.contactedTotal));
  const wide = useWide();
  const press = (p: TeamMember) => (tab === 'pending' ? setOpen(p) : p.mobile ? void Linking.openURL(`tel:${p.mobile}`) : undefined);
  const cols: Column<TeamMember>[] = [
    { key: 'name', label: t('admin.col.name'), value: (p) => p.name, flex: 2 },
    { key: 'mobile', label: t('admin.col.mobile'), value: (p) => (p.mobile ? `+91 ${p.mobile}` : '—'), flex: 1.4 },
    { key: 'booths', label: t('admin.col.booth'), value: (p) => p.booths.join(', '), flex: 1.2 },
    ...(tab === 'approved'
      ? [
          { key: 'today', label: t('admin.col.today'), value: (p: TeamMember) => p.contactedToday, align: 'right' as const },
          { key: 'total', label: t('admin.col.contacted'), value: (p: TeamMember) => p.contactedTotal, align: 'right' as const },
          // Sync-modes S9: last sync and changes still on the volunteer's phone (as reported at their last sync).
          { key: 'sync', label: t('admin.col.lastSync'), flex: 1.3, value: (p: TeamMember) => p.lastSyncAt ?? '', render: (p: TeamMember) => <AppText variant="callout" tabular>{p.lastSyncAt ? ago(p.lastSyncAt) : t('admin.col.neverSynced')}</AppText> },
          { key: 'unsent', label: t('admin.col.unsent'), value: (p: TeamMember) => p.unsent ?? 0, align: 'right' as const, render: (p: TeamMember) => <AppText variant="callout" tabular color={p.unsent ? colors.warning : colors.text}>{String(p.unsent ?? 0)}</AppText> },
        ]
      : tab === 'rejected'
        ? [{ key: 'reason', label: t('admin.rejectReason'), value: (p: TeamMember) => p.rejectReason ?? '—', flex: 2 }]
        : [{ key: 'act', label: '', sortable: false, value: () => '', flex: 1, align: 'right' as const, render: () => <AppText variant="callout" weight="semibold" color={colors.accent}>{t('admin.review')}</AppText> }]),
  ];

  return (
    <Screen header={<TeamBar trailing={<SyncBadge />} />}>
      <LargeTitle title={t('admin.tabs.team')} subtitle={m ? t('admin.acTitle', { no: m.acNo, name: m.acName }) : undefined} />
      <View style={s.pad}>
        <SegmentedControl<Tab>
          label={t('admin.tabs.team')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'pending', label: `${t('admin.pendingShort')}${pendingN ? ` (${pendingN})` : ''}` },
            { value: 'approved', label: t('admin.approved') },
            { value: 'rejected', label: t('admin.rejected') },
          ]}
        />
        {tab !== 'pending' ? <Field label={t('admin.searchTeam')} value={search} onChangeText={setSearch} autoCorrect={false} /> : null}
        {tab === 'approved' ? (
          <ChipRow chips={(['all', 'out', 'quiet'] as const).map((k) => ({ key: k, label: t(`easy.act.${k}`), selected: act === k, tone: k === 'out' ? 'our' as const : k === 'quiet' ? 'opp' as const : undefined,
            count: (q.data ?? []).filter((p) => (!boothNo || p.booths.includes(boothNo)) && (k === 'all' || (k === 'out' ? p.contactedToday > 0 : p.contactedToday === 0))).length, onPress: () => setAct(k) }))} />
        ) : null}
      </View>
      {tab === 'approved' ? <ToolRow sortWord={t(`easy.tsort.${sort}`)} onSort={() => setSortSheet(true)} /> : null}
      {boothNo ? <AppText variant="callout" weight="bold" color={colors.textSecondary} style={s.pad}>{t('easy.boothNo', { no: boothNo })}</AppText> : null}
      {!q.data ? (
        <QueryState loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} />
      ) : rows.length === 0 ? (
        <AppText variant="callout" color={colors.textSecondary} align="center" style={s.empty}>{tab === 'pending' ? t('admin.noPending') : '—'}</AppText>
      ) : wide ? (
        <View style={s.tableGap}>
          <DataTable columns={cols} rows={rows} rowKey={(p) => p.membershipId} onRowPress={press} rowA11y={(p) => [p.name, p.mobile ? `+91 ${p.mobile}` : null].filter(Boolean).join(', ')} />
        </View>
      ) : (
        <Group>
          {rows.map((p, i) => (
            <Row
              key={p.membershipId}
              title={p.name}
              subtitle={tab === 'approved'
                ? `${t('common.booth', { no: p.booths.join(', ') })} · ${t('admin.todayTotal', { today: p.contactedToday, total: p.contactedTotal })}\n${t('admin.col.syncLine', { time: p.lastSyncAt ? ago(p.lastSyncAt) : t('admin.col.neverSynced'), n: p.unsent ?? 0 })}`
                : [p.mobile ? `+91 ${p.mobile}` : null, t('common.booth', { no: p.booths.join(', ') }), p.rejectReason].filter(Boolean).join(' · ')}
              // spec flow-fixes O1: approve in one tap; Review opens the sheet to change booths or reject.
              trailing={tab === 'pending' ? (
                <View style={s.acts}>
                  <Button kind="plain" compact label={t('admin.review')} onPress={() => setOpen(p)} a11yLabel={`${t('admin.review')} ${p.name}`} />
                  {p.booths.length ? (
                    <Button kind="success" compact label={t('admin.approve')} a11yLabel={`${t('admin.approve')} ${p.name}`}
                      onPress={() => void adminApi.approve(mid, p.membershipId, p.booths).then(() => qc.invalidateQueries({ queryKey: ['team', mid] }))} />
                  ) : null}
                </View>
              ) : undefined}
              onPress={tab === 'pending' || !p.mobile ? undefined : () => void Linking.openURL(`tel:${p.mobile}`)}
              last={i === rows.length - 1}
            />
          ))}
        </Group>
      )}
      <Sheet visible={sortSheet} title={t('easy.sort')} onClose={() => setSortSheet(false)}>
        {(['today', 'least', 'name', 'booth'] as const).map((x, i) => <ChoiceRow key={x} title={t(`easy.tsort.${x}`)} selected={sort === x} last={i === 3} onPress={() => { setSort(x); setSortSheet(false); }} />)}
      </Sheet>
      {open ? (
        <ApproveSheet
          mid={mid}
          member={open}
          acBooths={[]}
          onDone={() => {
            setOpen(null);
            void qc.invalidateQueries({ queryKey: ['team', mid] });
          }}
        />
      ) : null}
    </Screen>
  );
}

function ApproveSheet({ mid, member, onDone }: { mid: string; member: TeamMember; acBooths: number[]; onDone: () => void }) {
  const { t } = useTranslation();
  const boothsQ = useQuery({ queryKey: ['acBooths', mid], queryFn: () => adminApi.map(mid) });
  const [booths, setBooths] = useState<number[]>(member.booths);
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toggle = (no: number) => setBooths((b) => (b.includes(no) ? b.filter((x) => x !== no) : [...b, no].sort((a, c) => a - c)));
  const run = (fn: () => Promise<unknown>) => fn().then(onDone, (e: Error) => setError(e.message));
  return (
    <Sheet visible title={member.name} onClose={onDone} footer={[member.mobile ? `+91 ${member.mobile}` : null, member.epic ? `EPIC ${member.epic}` : null].filter(Boolean).join(' · ')}>
      <View style={s.sheet}>
        <AppText variant="footnote" color={colors.textSecondary}>{t('admin.boothsTap').toLocaleUpperCase()}</AppText>
        <View style={s.chips}>
          {(boothsQ.data ?? []).map((b) => {
            const on = booths.includes(b.no);
            return (
              <Pressable key={b.no} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${b.no}, ${b.name}`} onPress={() => toggle(b.no)} style={[s.chip, on && s.chipOn]}>
                <AppText variant="callout" weight="semibold" color={on ? colors.textOnAccent : colors.text}>{`${on ? '✓ ' : ''}${b.no}`}</AppText>
              </Pressable>
            );
          })}
        </View>
        {rejecting ? <Field label={t('admin.rejectReason')} value={reason} onChangeText={setReason} autoFocus /> : null}
        {error ? <AppText variant="footnote" color={colors.danger}>{error}</AppText> : null}
        <View style={s.row}>
          <Button kind="tinted" style={s.flex} label={t('admin.reject')} disabled={rejecting && reason.trim().length < 2}
            onPress={() => (rejecting ? void run(() => adminApi.reject(mid, member.membershipId, reason.trim())) : setRejecting(true))} />
          <Button kind="success" style={s.flex} label={t('admin.approve')} disabled={!booths.length} onPress={() => void run(() => adminApi.approve(mid, member.membershipId, booths))} />
        </View>
      </View>
    </Sheet>
  );
}

const s = themed(() => StyleSheet.create({
  acts: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tableGap: { marginTop: spacing.xl },
  pad: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.md },
  empty: { padding: spacing.xxl },
  sheet: { padding: spacing.lg, gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minWidth: 56, height: 40, paddingHorizontal: spacing.md, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.fill },
  chipOn: { backgroundColor: colors.accent },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
}));
