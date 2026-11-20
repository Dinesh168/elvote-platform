import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { adminApi, type Trace } from '@/api/adminApi';
import { ApiError } from '@/api/http';
import { AppText, Button, Field, LargeTitle, Screen, SegmentedControl } from '@/design/components';
import { colors, spacing } from '@/design/tokens';
import { TraceView } from '@/features/trace/TraceView';
import { useActiveMembership } from '@/stores/session';

/** C9: admin checks who changed a voter (own party, own AC). */
export default function AdminTrace() {
  const { t } = useTranslation();
  const m = useActiveMembership();
  const [by, setBy] = useState<'epic' | 'sno'>('epic');
  const [epic, setEpic] = useState('');
  const [booth, setBooth] = useState('');
  const [sno, setSno] = useState('');
  const [data, setData] = useState<Trace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ready = by === 'epic' ? epic.trim().length >= 3 : !!booth && !!sno;

  const find = async () => {
    if (!m || !ready) return;
    setBusy(true);
    setError(null);
    try {
      setData(await adminApi.trace(m.id, by === 'epic' ? { epic: epic.trim() } : { booth: Number(booth), sno: Number(sno) }));
    } catch (e) {
      setData(null);
      setError(e instanceof ApiError && e.code === 'voter_not_found' ? t('trace.notFound') : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen width="medium" back={t('admin.tabs.more')}>
      <LargeTitle title={t('trace.title')} subtitle={t('trace.sub')} />
      <View style={s.form}>
        <SegmentedControl<'epic' | 'sno'> label={t('trace.findBy')} value={by} onChange={setBy}
          options={[{ value: 'epic', label: t('trace.byEpic') }, { value: 'sno', label: t('trace.bySno') }]} />
        {by === 'epic' ? (
          <Field label={t('trace.epic')} value={epic} onChangeText={setEpic} autoCapitalize="characters" autoCorrect={false} onSubmitEditing={() => void find()} />
        ) : (
          <View style={s.row}>
            <View style={s.flex}><Field label={t('trace.booth')} value={booth} onChangeText={(x) => setBooth(x.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" /></View>
            <View style={s.flex}><Field label={t('trace.sno')} value={sno} onChangeText={(x) => setSno(x.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" onSubmitEditing={() => void find()} /></View>
          </View>
        )}
        <Button label={t('trace.find')} disabled={!ready || busy} onPress={() => void find()} />
        {error ? <AppText variant="callout" color={colors.danger}>{error}</AppText> : null}
      </View>
      {data ? <TraceView data={data} /> : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  form: { padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
