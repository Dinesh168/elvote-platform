import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { platformApi } from '@/api/adminApi';
import { readText, type PickedFile } from '@/api/upload';
import { AppText, Button, Group, LargeTitle, Row, Screen, SegmentedControl, Select } from '@/design/components';
import { ConfirmDialog } from '@/design/components/ConfirmDialog';
import { themed } from '@/design/theme';
import { colors, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { useStateChoice } from '@/features/common/useStateChoice';

/**
 * Super-admin → Past results (spec map-trend T2): upload an election-trend CSV for a state (each AC × year in the file
 * replaces what was there), list what is loaded, delete one AC × year. Admins only ever read these results.
 */
export default function PastResultsScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const states = useQuery({ queryKey: ['overview'], queryFn: platformApi.overview }).data?.states ?? [];
  const [state, setState] = useStateChoice(states.map((x) => x.code));
  const [file, setFile] = useState<PickedFile | null>(null);
  const [sample, setSample] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [del, setDel] = useState<{ acNo: number; year: number } | null>(null);
  const list = useQuery({ queryKey: ['past-results', state], queryFn: () => platformApi.pastResults(state) });

  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', '*/*'], copyToCacheDirectory: true });
    if (!r.canceled && r.assets[0]) { setFile(r.assets[0] as PickedFile); setMsg(null); }
  };
  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    setMsg(null);
    try {
      setMsg({ ok: true, text: await fn() });
      await qc.invalidateQueries({ queryKey: ['past-results', state] });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };
  const upload = () => run(async () => {
    const r = await platformApi.uploadPastResults(state, await readText(file!), sample);
    setFile(null);
    return t('past.done', { rows: r.rows, acs: r.acs.join(', '), years: r.years.join(', '), parties: r.parties.join(', ') });
  });
  const remove = (x: { acNo: number; year: number }) => run(async () => {
    const r = await platformApi.deletePastResults(state, x.acNo, x.year);
    return t('past.deleted', { n: r.deleted, ac: x.acNo, year: x.year });
  });

  return (
    <Screen back={t('platform.title')} width="medium">
      <LargeTitle title={t('past.title')} subtitle={t('past.sub')} />
      <Group header={t('past.upload')} footer={t('past.format')}>
        <View style={s.pad}>
          <Select label={t('platform.state')} value={state} onChange={setState} options={states.map((x) => ({ value: x.code, label: x.name }))} />
        </View>
        <Row title={file ? file.name : t('past.choose')} onPress={() => void pick()} chevron />
        <Row title={t('past.sample')} subtitle={t('past.sampleSub')} trailing={<Switch value={sample} onValueChange={setSample} accessibilityLabel={t('past.sample')} />} last />
      </Group>
      <View style={s.pad}>
        <Button label={busy ? t('past.uploading') : t('past.send')} disabled={!file || busy} onPress={() => void upload()} />
        {msg ? <AppText variant="callout" color={msg.ok ? colors.successText : colors.danger} style={s.msg} accessibilityLiveRegion="polite">{msg.text}</AppText> : null}
      </View>
      <Group header={t('past.loaded')}>
        {!list.data ? (
          <QueryState loading={list.isLoading} error={list.isError} onRetry={() => void list.refetch()} />
        ) : !list.data.items.length ? (
          <Row title={t('past.none')} last />
        ) : list.data.items.map((x, i, arr) => (
          <Row key={`${x.acNo}-${x.year}`} title={t('past.item', { ac: x.acNo, year: x.year })} subtitle={`${t('past.booths', { n: x.booths })}${x.sample ? ` · ${t('past.sampleTag')}` : ''}`}
            trailing={<Button kind="plain" compact label={t('past.delete')} onPress={() => setDel(x)} />} last={i === arr.length - 1} />
        ))}
      </Group>
      <ConfirmDialog visible={!!del} onDismiss={() => setDel(null)} title={del ? t('past.delTitle', { ac: del.acNo, year: del.year }) : ''} message={t('past.delMsg')}
        actions={[{ label: t('common.cancel'), style: 'cancel', onPress: () => setDel(null) }, { label: t('past.delete'), style: 'destructive', onPress: () => { const x = del!; setDel(null); void remove(x); } }]} />
    </Screen>
  );
}

const s = themed(() => StyleSheet.create({
  pad: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  msg: { marginTop: spacing.md },
}));
