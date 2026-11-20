import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { platformApi, type AdminBooth } from '@/api/adminApi';
import { AppText, Button, DataTable, Field, Group, LargeTitle, Row, Screen, SegmentedControl, Sheet, type Column } from '@/design/components';
import { useWide } from '@/design/layout';
import { themed } from '@/design/theme';
import { colors, radius, spacing, web } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { parseCsv } from '@/features/pollingDay/csv';

/** S2: booth locations per assembly: list, missing only, edit one, bulk from CSV. */
export default function BoothLocations() {
  const { t } = useTranslation();
  const wide = useWide();
  const qc = useQueryClient();
  const states = useQuery({ queryKey: ['overview'], queryFn: platformApi.overview }).data?.states ?? [];
  const [state, setState] = useState('PB');
  const acs = useQuery({ queryKey: ['acs', state], queryFn: () => platformApi.acs(state) });
  const [ac, setAc] = useState<number | null>(null);
  const acNo = ac ?? acs.data?.[0]?.acNo ?? null;
  const [missing, setMissing] = useState(false);
  const q = useQuery({ queryKey: ['adminBooths', state, acNo, missing], queryFn: () => platformApi.booths(state, acNo!, missing), enabled: acNo != null });
  const [edit, setEdit] = useState<AdminBooth | null>(null);
  const [bulk, setBulk] = useState(false);
  const refresh = () => void qc.invalidateQueries({ queryKey: ['adminBooths', state, acNo] });
  const src = (b: AdminBooth) => (b.source ? t(`pd.src.${b.source}`) : '—');
  const coord = (n: number | null) => (n == null ? '—' : n.toFixed(6));
  const cols: Column<AdminBooth>[] = [
    { key: 'no', label: t('pd.b.no'), value: (b) => b.no, flex: 0.6 },
    { key: 'name', label: t('pd.b.name'), value: (b) => b.name, flex: 2.4 },
    { key: 'lat', label: t('pd.lat'), value: (b) => b.lat ?? -1, flex: 1, render: (b) => <AppText variant="callout" tabular color={b.lat == null ? colors.danger : colors.text}>{b.lat == null ? t('pd.b.missing') : coord(b.lat)}</AppText> },
    { key: 'lng', label: t('pd.lng'), value: (b) => b.lng ?? -1, flex: 1, render: (b) => <AppText variant="callout" tabular>{coord(b.lng)}</AppText> },
    { key: 'src', label: t('pd.b.source'), value: (b) => src(b), flex: 0.9 },
  ];
  return (
    <Screen width="medium" back={t('platform.title')}>
      <LargeTitle title={t('pd.boothsTitle')} subtitle={t('pd.boothsSub')} />
      <View style={s.form}>
        {states.length > 1 ? (
          <SegmentedControl<string> label={t('platform.state')} value={state} onChange={(v) => { setState(v); setAc(null); }} options={states.map((x) => ({ value: x.code, label: x.name }))} />
        ) : null}
        <SegmentedControl<string> label={t('platform.acNo')} value={String(acNo ?? '')} onChange={(v) => setAc(Number(v))}
          options={(acs.data ?? []).map((a) => ({ value: String(a.acNo), label: `${a.acNo} · ${a.name}` }))} />
        <View style={s.bar}>
          <View style={s.flex}>
            <SegmentedControl<'all' | 'missing'> label={t('pd.b.filter')} value={missing ? 'missing' : 'all'} onChange={(v) => setMissing(v === 'missing')}
              options={[{ value: 'all', label: t('pd.all') }, { value: 'missing', label: t('pd.b.missingOnly') }]} />
          </View>
          <Button kind="tinted" label={t('pd.b.bulk')} disabled={acNo == null} onPress={() => setBulk(true)} />
        </View>
        {q.data ? (
          <AppText variant="callout" weight="semibold" color={q.data.missing ? colors.danger : colors.success}>
            {q.data.missing ? t('pd.b.count', { n: q.data.missing, total: q.data.total }) : t('pd.b.allSet', { total: q.data.total })}
          </AppText>
        ) : null}
      </View>
      {!q.data ? (
        <QueryState loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} />
      ) : wide ? (
        <DataTable columns={cols} rows={q.data.items} rowKey={(b) => String(b.no)} onRowPress={setEdit} empty={t('pd.b.none')} rowA11y={(b) => `${b.no} ${b.name}`} />
      ) : (
        <Group footer={q.data.items.length ? undefined : t('pd.b.none')}>
          {q.data.items.map((b, i) => (
            <Row key={b.no} title={`${b.no} · ${b.name}`} subtitle={b.lat == null ? t('pd.b.missing') : `${coord(b.lat)}, ${coord(b.lng)} · ${src(b)}`}
              titleColor={b.lat == null ? colors.danger : undefined} chevron onPress={() => setEdit(b)} last={i === q.data.items.length - 1} />
          ))}
        </Group>
      )}
      {edit && acNo != null ? <EditSheet state={state} ac={acNo} booth={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); refresh(); }} /> : null}
      {bulk && acNo != null ? <BulkSheet state={state} ac={acNo} onClose={() => setBulk(false)} onSaved={() => { setBulk(false); refresh(); }} /> : null}
    </Screen>
  );
}

function EditSheet({ state, ac, booth, onClose, onSaved }: { state: string; ac: number; booth: AdminBooth; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [lat, setLat] = useState(booth.lat != null ? String(booth.lat) : '');
  const [lng, setLng] = useState(booth.lng != null ? String(booth.lng) : '');
  const [err, setErr] = useState<string | null>(null);
  const la = Number(lat);
  const lo = Number(lng);
  const latBad = lat !== '' && !(la >= 6 && la <= 38);
  const lngBad = lng !== '' && !(lo >= 68 && lo <= 98);
  const go = (p: { lat: number | null; lng: number | null }) => platformApi.setBooth(state, ac, booth.no, p).then(onSaved, (e: Error) => setErr(e.message));
  return (
    <Sheet visible title={`${booth.no} · ${booth.name}`} onClose={onClose} footer={booth.locality ?? undefined}>
      <View style={s.sheet}>
        <Field label={t('pd.lat')} value={lat} onChangeText={setLat} keyboardType="decimal-pad" placeholder="30.912345" error={latBad ? t('pd.latRange') : null} />
        <Field label={t('pd.lng')} value={lng} onChangeText={setLng} keyboardType="decimal-pad" placeholder="75.712345" error={lngBad ? t('pd.lngRange') : null} />
        {err ? <AppText variant="callout" color={colors.danger}>{err}</AppText> : null}
        <Button label={t('cms.save')} disabled={!lat || !lng || latBad || lngBad} onPress={() => void go({ lat: la, lng: lo })} />
        {booth.lat != null ? <Button kind="plain" label={t('pd.b.clear')} onPress={() => void go({ lat: null, lng: null })} /> : null}
      </View>
    </Sheet>
  );
}

function BulkSheet({ state, ac, onClose, onSaved }: { state: string; ac: number; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [check, setCheck] = useState<{ ok: number; errors: { line: number; no: number; error: string }[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const parsed = parseCsv(text);
  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/plain', 'text/comma-separated-values'], copyToCacheDirectory: true });
    if (r.canceled || !r.assets?.[0]) return;
    setText(await (await fetch(r.assets[0].uri)).text());
    setCheck(null);
  };
  const run = async (dryRun: boolean) => {
    setBusy(true);
    setErr(null);
    try {
      const out = await platformApi.boothLocations(state, ac, parsed.rows, dryRun);
      if (dryRun) setCheck(out);
      else onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet visible title={t('pd.b.bulk')} onClose={onClose}>
      <View style={s.sheet}>
        <AppText variant="callout" color={colors.textSecondary}>{t('pd.b.bulkHint')}</AppText>
        <Button kind="tinted" label={t('pd.b.choose')} onPress={() => void pick()} />
        <TextInput value={text} onChangeText={(x) => { setText(x); setCheck(null); }} multiline accessibilityLabel={t('pd.b.paste')} placeholder={'part_no,lat,lng\n101,30.912345,75.712345'}
          placeholderTextColor={colors.textTertiary} style={s.area} autoCorrect={false} autoCapitalize="none" />
        {text ? <AppText variant="footnote" color={parsed.bad.length ? colors.danger : colors.textSecondary}>{t('pd.b.read', { n: parsed.rows.length })}{parsed.bad.length ? ` · ${t('pd.b.unreadable', { lines: parsed.bad.slice(0, 10).join(', ') })}` : ''}</AppText> : null}
        {check ? (
          <View style={s.check}>
            <AppText variant="callout" weight="semibold" color={colors.success}>{t('pd.b.willSave', { n: check.ok })}</AppText>
            {check.errors.slice(0, 20).map((e) => (
              <AppText key={e.line} variant="footnote" color={colors.danger}>{t('pd.b.lineErr', { line: e.line, no: e.no, why: t(`pd.b.err.${e.error}`) })}</AppText>
            ))}
            {check.errors.length > 20 ? <AppText variant="footnote" color={colors.danger}>{t('pd.b.more', { n: check.errors.length - 20 })}</AppText> : null}
          </View>
        ) : null}
        {err ? <AppText variant="callout" color={colors.danger}>{err}</AppText> : null}
        {!check ? (
          <Button label={t('pd.b.preview')} disabled={!parsed.rows.length || busy} onPress={() => void run(true)} />
        ) : (
          <Button kind="success" label={t('pd.b.save', { n: check.ok })} disabled={!check.ok || busy} onPress={() => void run(false)} />
        )}
      </View>
    </Sheet>
  );
}

const s = themed(() => StyleSheet.create({
  flex: { flex: 1 },
  form: { padding: spacing.lg, gap: spacing.md },
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sheet: { padding: spacing.lg, gap: spacing.md },
  area: { minHeight: 140, borderRadius: radius.md, borderWidth: 1, borderColor: web.border, padding: spacing.md, fontFamily: 'monospace', fontSize: 14, color: colors.text, backgroundColor: colors.surface },
  check: { gap: 4 },
}));
