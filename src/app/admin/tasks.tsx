import { useQuery, useQueryClient } from '@tanstack/react-query';
import { themed } from '@/design/theme';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { adminApi, type Drive } from '@/api/adminApi';
import { AppText, BarList, Button, ChoiceRow, Field, Group, LargeTitle, ProgressBar, Row, Screen, SegmentedControl, Sheet } from '@/design/components';
import { useWide } from '@/design/layout';
import { colors, radius, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { useActiveMembership } from '@/stores/session';
import { TeamBar } from '@/features/shell/TeamBar';
import { SyncBadge } from '@/features/sync/SyncBadge';

const KINDS = ['women', 'first_time', 'young', 'senior', 'target', 'our', 'migrated', 'other'] as const;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const fmt = (n: number) => n.toLocaleString('en-IN');

/** A-TASK-1/2: drives with targeted vs completed, status and days left; create a drive. */
export default function Tasks() {
  const { t } = useTranslation();
  const wide = useWide();
  const m = useActiveMembership();
  const mid = m?.id ?? '';
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['drives', mid], queryFn: () => adminApi.drives(mid), enabled: !!mid });
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<Drive | null>(null);
  const name = (d: Drive) => (d.kind === 'other' ? d.name : t(`admin.kinds.${d.kind}`));

  return (
    <Screen width="medium" header={<TeamBar trailing={<Button kind="plain" compact label={`+ ${t('admin.newDrive')}`} onPress={() => setCreating(true)} />} />} trailing={<Button kind={wide ? 'filled' : 'plain'} compact label={`+ ${t('admin.newDrive')}`} onPress={() => setCreating(true)} />}>
      <LargeTitle title={t('admin.drives')} subtitle={m ? t('admin.acTitle', { no: m.acNo, name: m.acName }) : undefined} />
      {!q.data ? (
        <QueryState loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} />
      ) : (
        <Group>
          {q.data.map((d, i) => (
            <Pressable key={d.id} accessibilityRole="button" accessibilityLabel={`${name(d)}, ${d.pct}%`} onPress={() => setOpen(d)} style={({ pressed }) => [s.drive, i < q.data.length - 1 && s.divider, pressed && { backgroundColor: colors.pressed }]}>
              <View style={s.head}>
                <AppText variant="headline" style={s.flex}>{name(d)}</AppText>
                <View style={[s.badge, d.status === 'ongoing' ? s.on : d.status === 'completed' ? s.done : null]}>
                  <AppText variant="caption" weight="semibold" color={d.status === 'ongoing' ? colors.accent : colors.textSecondary}>{t(`admin.status.${d.status}`)}</AppText>
                </View>
              </View>
              <AppText variant="callout" color={colors.textSecondary}>
                {`${d.startsOn} → ${d.endsOn}${d.status === 'ongoing' ? ` · ${t('admin.daysLeft', { n: d.daysLeft })}` : ''}`}
              </AppText>
              <ProgressBar value={d.targeted ? d.completed / d.targeted : 0} />
              <AppText variant="callout" tabular>{`${t('admin.targetedDone', { completed: fmt(d.completed), targeted: fmt(d.targeted) })} · ${d.pct}%`}</AppText>
            </Pressable>
          ))}
        </Group>
      )}

      {open ? (
        <Sheet visible title={name(open)} onClose={() => setOpen(null)}>
          <BarList a11yLabel={name(open)} max={100} items={open.byZone.map((z) => ({ key: z.zone, label: z.zone, value: z.pct, display: `${z.pct}%`, sub: `${fmt(z.completed)}/${fmt(z.targeted)}` }))} />
          <Row title={t('admin.deleteDrive')} titleColor={colors.danger} last onPress={() => void adminApi.deleteDrive(mid, open.id).then(() => { setOpen(null); void qc.invalidateQueries({ queryKey: ['drives', mid] }); })} />
        </Sheet>
      ) : null}
      {creating ? <NewDrive mid={mid} onDone={() => { setCreating(false); void qc.invalidateQueries({ queryKey: ['drives', mid] }); }} /> : null}
    </Screen>
  );
}

function NewDrive({ mid, onDone }: { mid: string; onDone: () => void }) {
  const { t } = useTranslation();
  const zonesQ = useQuery({ queryKey: ['zones', mid], queryFn: () => adminApi.zones(mid) });
  const [kind, setKind] = useState<(typeof KINDS)[number]>('women');
  const [custom, setCustom] = useState('');
  const [start, setStart] = useState(() => iso(new Date()));
  const [end, setEnd] = useState(() => iso(new Date(Date.now() + 14 * 86_400_000)));
  const [scope, setScope] = useState<'all' | 'zones'>('all');
  const [zones, setZones] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'kind' | 'details'>('kind');
  const save = () =>
    adminApi.createDrive(mid, { kind, customName: kind === 'other' ? custom.trim() : undefined, startsOn: start, endsOn: end, scope, zoneIds: scope === 'zones' ? zones : undefined })
      .then(onDone, (e: Error) => setError(e.message));

  return (
    <Sheet visible title={t('admin.newDrive')} onClose={onDone}>
      {step === 'kind' ? (
        KINDS.map((k, i) => <ChoiceRow key={k} title={t(`admin.kinds.${k}`)} selected={k === kind} onPress={() => { setKind(k); setStep('details'); }} last={i === KINDS.length - 1} />)
      ) : (
        <View style={s.form}>
          <AppText variant="headline">{t(`admin.kinds.${kind}`)}</AppText>
          {kind === 'other' ? <Field label={t('admin.driveName')} value={custom} onChangeText={setCustom} /> : null}
          <View style={s.row}>
            <View style={s.flex}><Field label={t('admin.start')} value={start} onChangeText={setStart} /></View>
            <View style={s.flex}><Field label={t('admin.end')} value={end} onChangeText={setEnd} /></View>
          </View>
          <SegmentedControl<'all' | 'zones'> label={t('admin.where')} value={scope} onChange={setScope}
            options={[{ value: 'all', label: t('admin.allBooths') }, { value: 'zones', label: t('admin.someZones') }]} />
          {scope === 'zones' ? (
            <View style={s.chips}>
              {(zonesQ.data?.zones ?? []).map((z) => {
                const on = zones.includes(z.id);
                return (
                  <Pressable key={z.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => setZones((x) => (on ? x.filter((y) => y !== z.id) : [...x, z.id]))} style={[s.chip, on && s.chipOn]}>
                    <AppText variant="callout" weight="semibold" color={on ? colors.textOnAccent : colors.text}>{`${on ? '✓ ' : ''}${z.name}`}</AppText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {error ? <AppText variant="footnote" color={colors.danger}>{error}</AppText> : null}
          <Button label={t('admin.create')} disabled={(kind === 'other' && custom.trim().length < 2) || (scope === 'zones' && !zones.length)} onPress={() => void save()} />
        </View>
      )}
    </Sheet>
  );
}

const s = themed(() => StyleSheet.create({
  drive: { padding: spacing.lg, gap: 6, backgroundColor: colors.surface },
  divider: { borderBottomWidth: 0.5, borderBottomColor: colors.separator },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, backgroundColor: colors.fill },
  on: { backgroundColor: colors.accentTint },
  done: { backgroundColor: colors.fill },
  form: { padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minWidth: 56, height: 40, paddingHorizontal: spacing.md, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.fill },
  chipOn: { backgroundColor: colors.accent },
}));
