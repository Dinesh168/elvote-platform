import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { platformApi, type Trace } from '@/api/adminApi';
import { ApiError } from '@/api/http';
import { AppText, Button, Field, LargeTitle, Screen, SegmentedControl } from '@/design/components';
import { colors, spacing } from '@/design/tokens';
import { TraceView } from '@/features/trace/TraceView';

/** C9: super-admin checks who changed a voter, across all parties. */
export default function PlatformTrace() {
  const { t } = useTranslation();
  const states = useQuery({ queryKey: ['overview'], queryFn: platformApi.overview }).data?.states ?? [];
  const [state, setState] = useState('PB');
  const [ac, setAc] = useState('');
  const [epic, setEpic] = useState('');
  const [data, setData] = useState<Trace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ready = !!ac && epic.trim().length >= 3;

  const find = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      setData(await platformApi.trace(state, Number(ac), epic.trim()));
    } catch (e) {
      setData(null);
      setError(e instanceof ApiError && e.code === 'voter_not_found' ? t('trace.notFound') : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen width="medium" back={t('platform.title')}>
      <LargeTitle title={t('trace.title')} subtitle={t('trace.subAll')} />
      <View style={s.form}>
        {states.length > 1 ? (
          <SegmentedControl<string> label={t('platform.state')} value={state} onChange={setState} options={states.map((x) => ({ value: x.code, label: x.name }))} />
        ) : null}
        <View style={s.row}>
          <View style={s.ac}><Field label={t('platform.acNo')} value={ac} onChangeText={(x) => setAc(x.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" /></View>
          <View style={s.flex}><Field label={t('trace.epic')} value={epic} onChangeText={setEpic} autoCapitalize="characters" autoCorrect={false} onSubmitEditing={() => void find()} /></View>
        </View>
        <Button label={t('trace.find')} disabled={!ready || busy} onPress={() => void find()} />
        {error ? <AppText variant="callout" color={colors.danger}>{error}</AppText> : null}
      </View>
      {data ? <TraceView data={data} showParty /> : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  form: { padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  ac: { width: 140 },
  flex: { flex: 1 },
});
