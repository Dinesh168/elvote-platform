import { useQuery, useQueryClient } from '@tanstack/react-query';
import { themed } from '@/design/theme';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { platformApi } from '@/api/adminApi';
import { AppText, Button, Field, Group, LargeTitle, Row, Screen, SegmentedControl } from '@/design/components';
import { colors, radius, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';

/** Parties: list, add a party, give an AC to a party (with max zones). */
export default function Parties() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['parties'], queryFn: platformApi.parties });
  const [name, setName] = useState('');
  const [short, setShort] = useState('');
  const [party, setParty] = useState<string | null>(null);
  const [state, setState] = useState('PB');
  const [ac, setAc] = useState<number | null>(null);
  const [maxZones, setMaxZones] = useState('10');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const acsQ = useQuery({ queryKey: ['acs', state], queryFn: () => platformApi.acs(state) });
  const done = (text: string) => {
    setMsg({ ok: true, text });
    void qc.invalidateQueries({ queryKey: ['parties'] });
    void qc.invalidateQueries({ queryKey: ['overview'] });
  };
  const fail = (e: Error) => setMsg({ ok: false, text: e.message });

  return (
    <Screen width="medium" back={t('platform.title')}>
      <LargeTitle title={t('platform.parties')} />
      {!q.data ? (
        <QueryState loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} />
      ) : (
        <Group>
          {q.data.map((p, i) => (
            <Row key={p.id} title={p.name} subtitle={p.shortName ?? undefined} value={`${p.acs} ${t('platform.ac')}`} last={i === q.data.length - 1} />
          ))}
        </Group>
      )}

      <Group header={t('platform.addParty')}>
        <View style={s.form}>
          <Field label={t('platform.partyName')} value={name} onChangeText={setName} />
          <Field label={t('platform.shortName')} value={short} onChangeText={setShort} />
          <Button label={t('platform.addParty')} disabled={name.trim().length < 2} onPress={() => void platformApi.addParty(name.trim(), short.trim()).then(() => { setName(''); setShort(''); done(t('admin.saved')); }, fail)} />
        </View>
      </Group>

      <Group header={t('platform.addAc')}>
        <View style={s.form}>
          <AppText variant="footnote" color={colors.textSecondary}>{t('platform.party').toLocaleUpperCase()}</AppText>
          <View style={s.chips}>
            {(q.data ?? []).map((p) => (
              <Chip key={p.id} label={p.shortName ?? p.name} on={party === p.id} onPress={() => setParty(p.id)} />
            ))}
          </View>
          <SegmentedControl label={t('platform.state')} value={state} onChange={(v) => { setState(v); setAc(null); }} options={[{ value: 'PB', label: 'Punjab' }, { value: 'HR', label: 'Haryana' }]} />
          <View style={s.chips}>
            {(acsQ.data ?? []).map((a) => (
              <Chip key={a.acNo} label={`${a.acNo} ${a.name}`} on={ac === a.acNo} onPress={() => setAc(a.acNo)} />
            ))}
          </View>
          <Field label={t('platform.maxZones')} value={maxZones} keyboardType="number-pad" onChangeText={(x) => setMaxZones(x.replace(/\D/g, '').slice(0, 2))} />
          {msg ? <AppText variant="callout" color={msg.ok ? colors.success : colors.danger}>{msg.text}</AppText> : null}
          <Button label={t('platform.addAc')} disabled={!party || !ac || !Number(maxZones)}
            onPress={() => void platformApi.addPartyAc(party!, state, ac!, Number(maxZones)).then(() => done(t('admin.saved')), fail)} />
        </View>
      </Group>
    </Screen>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={onPress} style={[s.chip, on && s.chipOn]}>
      <AppText variant="callout" weight="semibold" color={on ? colors.textOnAccent : colors.text}>{label}</AppText>
    </Pressable>
  );
}

const s = themed(() => StyleSheet.create({
  form: { padding: spacing.lg, gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { height: 40, paddingHorizontal: spacing.md, borderRadius: radius.full, justifyContent: 'center', backgroundColor: colors.fill },
  chipOn: { backgroundColor: colors.accent },
}));
