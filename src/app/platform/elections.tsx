import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { platformApi, type Election, type ElectionInput } from '@/api/adminApi';
import { AppText, Button, DataTable, Field, Group, LargeTitle, Row, Screen, SegmentedControl, Select, Sheet, type Column } from '@/design/components';
import { useWide } from '@/design/layout';
import { themed } from '@/design/theme';
import { colors, radius, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { useStateChoice } from '@/features/common/useStateChoice';
import { localeOf } from '@/i18n';

const todayIst = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const KINDS: ElectionInput['kind'][] = ['assembly', 'parliament', 'bye', 'local'];

/** S1: polling days per state (optionally for some assemblies), with the voting window. */
export default function Elections() {
  const { t, i18n } = useTranslation();
  const wide = useWide();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['elections'], queryFn: platformApi.elections });
  const [edit, setEdit] = useState<Election | 'new' | null>(null);
  const [past, setPast] = useState(false);
  const today = todayIst();
  const list = (q.data ?? []).filter((e) => (past ? e.date < today || e.status === 'done' : e.date >= today && e.status !== 'done'));
  const date = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString(localeOf(i18n.language), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const acs = (e: Election) => (e.acNos ? t('pd.acList', { list: e.acNos.join(', ') }) : t('pd.allAcs'));
  const statusText = (e: Election) => (e.status === 'cancelled' ? t('pd.el.cancelled') : e.inWindow ? t('pd.liveNow') : t(`pd.el.${e.status}`));
  const cols: Column<Election>[] = [
    { key: 'date', label: t('pd.el.date'), value: (e) => e.date, flex: 1.5, render: (e) => <AppText variant="callout" tabular>{date(e.date)}</AppText> },
    { key: 'state', label: t('platform.state'), value: (e) => e.stateName, flex: 1 },
    { key: 'name', label: t('pd.el.name'), value: (e) => e.name, flex: 2 },
    { key: 'acs', label: t('pd.el.acs'), value: (e) => acs(e), flex: 1.4 },
    { key: 'win', label: t('pd.el.window'), value: (e) => e.opensAt, flex: 1, render: (e) => <AppText variant="callout" tabular>{`${e.opensAt}–${e.closesAt}`}</AppText> },
    {
      key: 'status', label: t('pd.col.status'), value: (e) => statusText(e), flex: 1,
      render: (e) => <AppText variant="callout" weight="semibold" color={e.status === 'cancelled' ? colors.textSecondary : e.inWindow ? colors.success : colors.text}>{statusText(e)}</AppText>,
    },
  ];
  return (
    <Screen width="medium" back={t('platform.title')}>
      <LargeTitle title={t('pd.elections')} subtitle={t('pd.electionsSub')} />
      <View style={s.bar}>
        <View style={s.flex}>
          <SegmentedControl<'up' | 'past'> label={t('pd.elections')} value={past ? 'past' : 'up'} onChange={(v) => setPast(v === 'past')}
            options={[{ value: 'up', label: t('pd.el.upcoming') }, { value: 'past', label: t('pd.el.past') }]} />
        </View>
        <Button label={t('pd.el.add')} onPress={() => setEdit('new')} />
      </View>
      {!q.data ? (
        <QueryState loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} />
      ) : wide ? (
        <DataTable columns={cols} rows={list} rowKey={(e) => e.id} onRowPress={setEdit} empty={t('pd.el.none')}
          initialSort={{ key: 'date', dir: past ? 'desc' : 'asc' }} rowA11y={(e) => `${e.name}, ${date(e.date)}`} />
      ) : (
        <Group footer={list.length ? undefined : t('pd.el.none')}>
          {list.map((e, i) => (
            <Row key={e.id} title={e.name} subtitle={`${date(e.date)} · ${e.opensAt}–${e.closesAt}\n${e.stateName} · ${acs(e)}`} value={statusText(e)}
              chevron onPress={() => setEdit(e)} last={i === list.length - 1} />
          ))}
        </Group>
      )}
      {edit ? (
        <ElectionSheet election={edit === 'new' ? null : edit} onClose={() => setEdit(null)}
          onSaved={() => { setEdit(null); void qc.invalidateQueries({ queryKey: ['elections'] }); }} />
      ) : null}
    </Screen>
  );
}

function ElectionSheet({ election, onClose, onSaved }: { election: Election | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const states = useQuery({ queryKey: ['overview'], queryFn: platformApi.overview }).data?.states ?? [];
  const [picked, pick] = useStateChoice(states.map((x) => x.code));
  const [state, setState] = useState(election?.stateCode ?? picked);
  const acsQ = useQuery({ queryKey: ['acs', state], queryFn: () => platformApi.acs(state) });
  const [kind, setKind] = useState<ElectionInput['kind']>((election?.kind as ElectionInput['kind']) ?? 'assembly');
  const [name, setName] = useState(election?.name ?? '');
  const [date, setDate] = useState(election?.date ?? '');
  const [opens, setOpens] = useState(election?.opensAt ?? '05:00');
  const [closes, setCloses] = useState(election?.closesAt ?? '19:00');
  const [some, setSome] = useState<number[] | null>(election?.acNos ?? null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timeOk = (x: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(x);
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date));
  const past = dateOk && date < todayIst() && date !== election?.date;
  const ok = name.trim().length >= 3 && dateOk && !past && timeOk(opens) && timeOk(closes) && closes > opens && (some === null || some.length > 0);
  const toggle = (n: number) => setSome((x) => ((x ?? []).includes(n) ? (x ?? []).filter((y) => y !== n) : [...(x ?? []), n].sort((a, b) => a - b)));
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const save = () => run(() => {
    const body = { kind, name: name.trim(), pollDate: date, acNos: some, opensAt: opens, closesAt: closes };
    return election ? platformApi.updateElection(election.stateCode, election.id, body) : platformApi.addElection({ stateCode: state, ...body });
  });
  return (
    <Sheet visible title={election ? t('pd.el.edit') : t('pd.el.add')} onClose={onClose}>
      <View style={s.sheet}>
        {!election && states.length > 1 ? (
          <Select label={t('platform.state')} value={state} onChange={(v) => { setState(v); pick(v); setSome(null); }}
            options={states.map((x) => ({ value: x.code, label: x.name }))} />
        ) : (
          <AppText variant="callout" color={colors.textSecondary}>{states.find((x) => x.code === state)?.name ?? state}</AppText>
        )}
        <SegmentedControl<ElectionInput['kind']> label={t('pd.el.kind')} value={kind} onChange={setKind} options={KINDS.map((k) => ({ value: k, label: t(`pd.el.k.${k}`) }))} />
        <Field label={t('pd.el.name')} value={name} onChangeText={setName} maxLength={80} placeholder={t('pd.el.namePh')} />
        <Field label={t('pd.el.date')} value={date} onChangeText={setDate} placeholder="2027-02-20" maxLength={10} autoCorrect={false}
          hint={t('pd.el.dateHint')} error={date && !dateOk ? t('pd.el.dateBad') : past ? t('pd.el.datePast') : null} />
        <View style={s.row}>
          <View style={s.flex}>
            <Field label={t('pd.el.opens')} value={opens} onChangeText={setOpens} placeholder="05:00" maxLength={5} error={opens && !timeOk(opens) ? '00:00–23:59' : null} />
          </View>
          <View style={s.flex}>
            <Field label={t('pd.el.closes')} value={closes} onChangeText={setCloses} placeholder="19:00" maxLength={5}
              error={closes && !timeOk(closes) ? '00:00–23:59' : timeOk(opens) && timeOk(closes) && closes <= opens ? t('pd.el.closeAfter') : null} />
          </View>
        </View>
        <SegmentedControl<'all' | 'some'> label={t('pd.el.acs')} value={some === null ? 'all' : 'some'} onChange={(v) => setSome(v === 'all' ? null : [])}
          options={[{ value: 'all', label: t('pd.allAcs') }, { value: 'some', label: t('pd.el.someAcs') }]} />
        {some !== null ? (
          <View style={s.chips}>
            {(acsQ.data ?? []).map((a) => {
              const on = some.includes(a.acNo);
              return (
                <Pressable key={a.acNo} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${a.acNo} ${a.name}`}
                  onPress={() => toggle(a.acNo)} style={[s.chip, on && s.chipOn]}>
                  <AppText variant="callout" weight="semibold" color={on ? colors.textOnAccent : colors.text}>{`${on ? '✓ ' : ''}${a.acNo} · ${a.name}`}</AppText>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {err ? <AppText variant="callout" color={colors.danger}>{err}</AppText> : null}
        <Button label={t('cms.save')} disabled={!ok || busy} onPress={() => void save()} />
        {election && election.status !== 'cancelled' ? (
          <Button kind="danger" label={t('pd.el.cancel')} disabled={busy} onPress={() => void run(() => platformApi.updateElection(election.stateCode, election.id, { status: 'cancelled' }))} />
        ) : null}
        {election?.status === 'cancelled' ? (
          <Button kind="tinted" label={t('pd.el.restore')} disabled={busy} onPress={() => void run(() => platformApi.updateElection(election.stateCode, election.id, { status: 'upcoming' }))} />
        ) : null}
      </View>
    </Sheet>
  );
}

const s = themed(() => StyleSheet.create({
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  sheet: { padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { height: 40, paddingHorizontal: spacing.md, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.fill },
  chipOn: { backgroundColor: colors.accent },
}));
