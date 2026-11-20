import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { platformApi, type ImportJob } from '@/api/adminApi';
import { AppText, Button, Field, Group, LargeTitle, Row, Screen, SegmentedControl } from '@/design/components';
import { colors, spacing } from '@/design/tokens';

type Picked = { name: string; uri: string; mimeType?: string; file?: File };

/** Voter-roll upload (super-admin only): pick file → check → see errors → add to the database. */
export default function Upload() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [state, setState] = useState('PB');
  const [acNo, setAcNo] = useState('');
  const [acName, setAcName] = useState('');
  const [file, setFile] = useState<Picked | null>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recent = useQuery({ queryKey: ['imports', state], queryFn: () => platformApi.imports(state) });

  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '*/*'], copyToCacheDirectory: true });
    if (!r.canceled && r.assets[0]) setFile(r.assets[0] as Picked);
  };

  const poll = async (id: string) => {
    for (let i = 0; i < 120; i++) {
      const j = await platformApi.importJob(state, id);
      setJob(j);
      if (!['queued', 'validating', 'merging'].includes(j.status)) return j;
      await new Promise((r) => setTimeout(r, 1000));
    }
  };

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setJob(null);
    try {
      const form = new FormData();
      form.append('stateCode', state);
      form.append('acNo', acNo);
      if (acName.trim()) form.append('acName', acName.trim());
      if (Platform.OS === 'web' && file.file) form.append('file', file.file, file.name);
      else form.append('file', { uri: file.uri, name: file.name, type: file.mimeType ?? 'text/csv' } as unknown as Blob);
      const r = await platformApi.upload(form);
      await poll(r.jobId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      void recent.refetch();
    }
  };

  const merge = async () => {
    if (!job) return;
    setBusy(true);
    try {
      await platformApi.confirmImport(state, job.id);
      await poll(job.id);
      void qc.invalidateQueries({ queryKey: ['overview'] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      void recent.refetch();
    }
  };

  return (
    <Screen width="narrow" back={t('platform.title')}>
      <LargeTitle title={t('platform.upload')} />
      <Group footer={t('platform.uploadHint')}>
        <View style={s.form}>
          <SegmentedControl label={t('platform.state')} value={state} onChange={setState} options={[{ value: 'PB', label: 'Punjab' }, { value: 'HR', label: 'Haryana' }]} />
          <Field label={t('platform.acNo')} value={acNo} keyboardType="number-pad" onChangeText={(x) => setAcNo(x.replace(/\D/g, '').slice(0, 3))} />
          <Field label={t('platform.acName')} value={acName} onChangeText={setAcName} />
          <Button kind="tinted" label={file ? file.name : t('platform.chooseFile')} onPress={() => void pick()} />
          {error ? <AppText variant="callout" color={colors.danger}>{error}</AppText> : null}
          <Button label={t('platform.check')} disabled={!file || !acNo || busy} onPress={() => void upload()} />
        </View>
      </Group>

      {job ? (
        <Group header={`${job.file_name} · ${job.status}`} footer={job.message ?? undefined}>
          <Row title={t('platform.jobRows', { ok: job.rows_ok, bad: job.rows_failed })} last={!job.errors?.length && job.status !== 'ready'} />
          {(job.errors ?? []).slice(0, 20).map((e) => (
            <Row key={e.row} title={t('platform.rowError', { row: e.row, error: e.error })} titleColor={colors.danger} />
          ))}
          {job.status === 'ready' ? <View style={s.form}><Button kind="success" label={t('platform.merge')} disabled={busy} onPress={() => void merge()} /></View> : null}
        </Group>
      ) : null}

      <Group header={t('platform.recentUploads')}>
        {(recent.data ?? []).slice(0, 10).map((j, i, arr) => (
          <Row key={j.id} title={`${t('platform.acRow', { no: j.ac_no, name: '' })} · ${j.file_name}`} subtitle={`${j.status} · ${t('platform.jobRows', { ok: j.rows_ok, bad: j.rows_failed })}`} last={i === arr.length - 1} />
        ))}
      </Group>
    </Screen>
  );
}

const s = StyleSheet.create({ form: { padding: spacing.lg, gap: spacing.md } });
