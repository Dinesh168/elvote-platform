import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { platformApi, type HeldRow, type ImportJob, type RollKind } from '@/api/adminApi';
import { appendFile } from '@/api/upload';
import { AppText, Button, Field, Group, LargeTitle, Row, Screen, SegmentedControl } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, radius, spacing, web } from '@/design/tokens';

type Picked = { name: string; uri: string; mimeType?: string; file?: File };
const LIST_SHOWN = 20;

/**
 * Voter-roll upload (super-admin): pick file → check → preview what will change (spec bilingual-roll U3) → decide voters that
 * belong to another assembly (U7) → Apply, or Cancel and nothing changes.
 */
export default function Upload() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const states = useQuery({ queryKey: ['overview'], queryFn: platformApi.overview }).data?.states ?? [];
  const [state, setState] = useState('PB');
  const [acNo, setAcNo] = useState('');
  const [acName, setAcName] = useState('');
  const [acNameLocal, setAcNameLocal] = useState('');
  const [kind, setKind] = useState<RollKind>('draft');
  const [publishedOn, setPublishedOn] = useState('');
  const [file, setFile] = useState<Picked | null>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const recent = useQuery({ queryKey: ['imports', state], queryFn: () => platformApi.imports(state) });
  const acs = useQuery({ queryKey: ['acs', state], queryFn: () => platformApi.acs(state) });
  const ac = (acs.data ?? []).find((a) => a.acNo === Number(acNo));
  const dateOk = !publishedOn || /^\d{4}-\d{2}-\d{2}$/.test(publishedOn);

  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '*/*'], copyToCacheDirectory: true });
    if (!r.canceled && r.assets[0]) setFile(r.assets[0] as Picked);
  };

  const poll = async (id: string) => {
    for (let i = 0; i < 300; i++) {
      const j = await platformApi.importJob(state, id);
      setJob(j);
      if (!['queued', 'validating', 'merging'].includes(j.status)) return j;
      await new Promise((r) => setTimeout(r, 1000));
    }
  };
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
      void recent.refetch();
    }
  };

  const upload = () => run(async () => {
    if (!file) return;
    setJob(null);
    const form = new FormData();
    form.append('stateCode', state);
    form.append('acNo', acNo);
    form.append('rollKind', kind);
    if (publishedOn) form.append('publishedOn', publishedOn);
    if (acName.trim()) form.append('acName', acName.trim());
    if (acNameLocal.trim()) form.append('acNameLocal', acNameLocal.trim());
    await appendFile(form, 'file', { uri: file.uri, name: file.name, type: file.mimeType ?? 'text/csv', file: file.file ?? null });
    const r = await platformApi.upload(form);
    await poll(r.jobId);
  });
  const apply = () => run(async () => {
    if (!job) return;
    await platformApi.confirmImport(state, job.id);
    const j = await poll(job.id);
    if (j?.status === 'done') setMsg({ ok: true, text: t('roll.applied') });
    void qc.invalidateQueries({ queryKey: ['overview'] });
    void qc.invalidateQueries({ queryKey: ['acs', state] });
  });
  const cancel = () => run(async () => {
    if (!job) return;
    await platformApi.cancelImport(state, job.id);
    setJob(null);
    setMsg({ ok: true, text: t('roll.cancelled') });
  });
  const decide = (body: Parameters<typeof platformApi.decideHeld>[2]) => run(async () => {
    if (!job) return;
    const r = await platformApi.decideHeld(state, job.id, body);
    setJob({ ...job, lists: job.lists ? { ...job.lists, held: r.held } : job.lists });
  });
  const setLang = (lang: 'hi' | 'pa') => run(async () => {
    if (!ac) return;
    await platformApi.setAc(state, ac.acNo, { regionalLang: lang });
    await acs.refetch();
    setMsg({ ok: true, text: t('roll.langSaved') });
  });

  const held = job?.lists?.held ?? [];
  const undecided = held.filter((h) => !h.decision).length;
  const sm = job?.summary;

  return (
    <Screen width="narrow" back={t('platform.title')}>
      <LargeTitle title={t('platform.upload')} />
      <Group footer={t('platform.uploadHint')}>
        <View style={s.form}>
          <SegmentedControl label={t('platform.state')} value={state} onChange={setState}
            options={(states.length ? states : [{ code: 'PB', name: 'Punjab' }, { code: 'HR', name: 'Haryana' }]).map((x) => ({ value: x.code, label: x.name }))} />
          <Field label={t('platform.acNo')} value={acNo} keyboardType="number-pad" onChangeText={(x) => setAcNo(x.replace(/\D/g, '').slice(0, 3))}
            hint={ac ? `${ac.name}${ac.nameLocal ? ` · ${ac.nameLocal}` : ''}` : undefined} />
          {!ac ? <Field label={t('platform.acName')} value={acName} onChangeText={setAcName} /> : null}
          <Field label={t('roll.acNameLocal')} value={acNameLocal} onChangeText={setAcNameLocal} placeholder={ac?.nameLocal ?? ''} />
          {ac ? (
            <View style={s.block}>
              <AppText variant="footnote" color={colors.textSecondary}>{t('roll.dataLang')}</AppText>
              <SegmentedControl<'hi' | 'pa'> label={t('roll.dataLang')} value={ac.regionalLang} onChange={(v) => void setLang(v)}
                options={[{ value: 'pa', label: 'ਪੰਜਾਬੀ' }, { value: 'hi', label: 'हिन्दी' }]} />
              <AppText variant="footnote" color={colors.textSecondary}>{t('roll.dataLangHint')}</AppText>
            </View>
          ) : null}
          <View style={s.block}>
            <AppText variant="footnote" color={colors.textSecondary}>{t('roll.kindLabel')}</AppText>
            <SegmentedControl<RollKind> label={t('roll.kindLabel')} value={kind} onChange={setKind}
              options={(['draft', 'final', 'supplement'] as const).map((k) => ({ value: k, label: t(`roll.kind.${k}`) }))} />
          </View>
          <Field label={t('roll.publishedOn')} value={publishedOn} onChangeText={setPublishedOn} placeholder="2026-11-25" maxLength={10} autoCorrect={false}
            error={dateOk ? null : t('pd.el.dateBad')} />
          <Button kind="tinted" label={file ? file.name : t('platform.chooseFile')} onPress={() => void pick()} />
          <Button label={t('platform.check')} disabled={!file || !acNo || !dateOk || busy} onPress={() => void upload()} />
          {msg ? <AppText variant="callout" color={msg.ok ? colors.success : colors.danger}>{msg.text}</AppText> : null}
        </View>
      </Group>

      {job ? (
        <Group header={`${job.file_name} · ${job.status}`} footer={job.message ?? undefined}>
          <Row title={t('platform.jobRows', { ok: job.rows_ok, bad: job.rows_failed })} last={!job.errors?.length} />
          {(job.errors ?? []).slice(0, 20).map((e, i, arr) => (
            <Row key={e.row} title={t('platform.rowError', { row: e.row, error: e.error })} titleColor={colors.danger} last={i === arr.length - 1} />
          ))}
        </Group>
      ) : null}

      {job?.status === 'ready' && sm ? (
        <>
          <Group header={t('roll.preview')}>
            <View style={s.tiles}>
              {([['unchanged', sm.unchanged], ['changed', sm.changed], ['moved', sm.moved], ['new', sm.new], ['back', sm.back], ['notIn', sm.notInRoll], ['held', sm.held]] as const)
                .map(([k, n]) => (
                  <View key={k} style={s.tile} accessible accessibilityLabel={`${t(`roll.${k}`)}: ${n}`}>
                    <AppText variant="title2" tabular color={k === 'notIn' && n ? colors.warning : k === 'held' && n ? colors.danger : colors.text}>{String(n)}</AppText>
                    <AppText variant="footnote" color={colors.textSecondary}>{t(`roll.${k}`)}</AppText>
                  </View>
                ))}
            </View>
          </Group>
          <List title={t('roll.moved')} rows={(job.lists?.moved ?? []).map((x) => ({ key: x.epic, title: x.name, sub: `${x.epic} · ${t('roll.fromTo', { from: x.from, to: x.to })}` }))} more={sm.moved} />
          <List title={t('roll.new')} rows={(job.lists?.new ?? []).map((x) => ({ key: x.epic, title: x.name, sub: `${x.epic} · ${t('common.booth', { no: x.part })}` }))} more={sm.new} />
          <List title={t('roll.notIn')} rows={(job.lists?.notInRoll ?? []).map((x) => ({ key: x.epic, title: x.name, sub: `${x.epic} · ${t('common.booth', { no: x.part })}` }))} more={sm.notInRoll} />
          {held.length ? (
            <Group header={`${t('roll.held')} (${held.length})`} footer={t('roll.heldHint')}>
              <View style={s.rowBtns}>
                <Button kind="tinted" compact label={t('roll.moveAll')} disabled={busy} onPress={() => void decide({ all: 'move' })} />
                <Button kind="tinted" compact label={t('roll.rejectAll')} disabled={busy} onPress={() => void decide({ all: 'reject' })} />
              </View>
              {held.slice(0, 100).map((h, i, arr) => <HeldItem key={h.rowNo} h={h} last={i === arr.length - 1} busy={busy} onDecide={(d) => void decide({ decisions: [{ rowNo: h.rowNo, decision: d }] })} />)}
            </Group>
          ) : null}
          <View style={s.form}>
            {undecided ? <AppText variant="callout" color={colors.danger}>{t('roll.decideFirst')}</AppText> : null}
            <Button kind="success" label={t('roll.apply')} disabled={busy || undecided > 0} onPress={() => void apply()} />
            <Button kind="plain" label={t('roll.cancel')} disabled={busy} onPress={() => void cancel()} />
          </View>
        </>
      ) : null}

      <Group header={t('platform.recentUploads')}>
        {(recent.data ?? []).slice(0, 10).map((j, i, arr) => (
          <Row key={j.id} title={`${t('platform.acRow', { no: j.ac_no, name: '' })} · ${j.file_name}`} subtitle={`${j.status} · ${t('platform.jobRows', { ok: j.rows_ok, bad: j.rows_failed })}`} last={i === arr.length - 1} />
        ))}
      </Group>
    </Screen>
  );
}

function List({ title, rows, more }: { title: string; rows: { key: string; title: string; sub: string }[]; more: number }) {
  const { t } = useTranslation();
  if (!rows.length) return null;
  const shown = rows.slice(0, LIST_SHOWN);
  return (
    <Group header={`${title} (${more})`} footer={more > shown.length ? t('roll.showMore', { n: more - shown.length }) : undefined}>
      {shown.map((r, i) => <Row key={r.key} title={r.title} subtitle={r.sub} last={i === shown.length - 1} />)}
    </Group>
  );
}

function HeldItem({ h, last, busy, onDecide }: { h: HeldRow; last: boolean; busy: boolean; onDecide: (d: 'move' | 'reject') => void }) {
  const { t } = useTranslation();
  return (
    <Row title={h.name} subtitle={`${h.epic} · ${t('roll.otherAc', { ac: h.otherAc })}${h.decision ? ` · ${t(`roll.decided.${h.decision}`)}` : ''}`} last={last}
      trailing={
        <View style={s.rowBtns}>
          <Button kind={h.decision === 'move' ? 'filled' : 'tinted'} compact label={t('roll.move')} disabled={busy} onPress={() => onDecide('move')} />
          <Button kind={h.decision === 'reject' ? 'danger' : 'plain'} compact label={t('roll.reject')} disabled={busy} onPress={() => onDecide('reject')} />
        </View>
      } />
  );
}

const s = themed(() => StyleSheet.create({
  form: { padding: spacing.lg, gap: spacing.md },
  block: { gap: 6 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, padding: spacing.md },
  tile: { flexBasis: '30%', flexGrow: 1, minWidth: 96, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: web.border, gap: 2 },
  rowBtns: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, flexWrap: 'wrap' },
}));
