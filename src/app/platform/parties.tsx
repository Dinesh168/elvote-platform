import { useQuery, useQueryClient } from '@tanstack/react-query';
import { themed } from '@/design/theme';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { platformApi } from '@/api/adminApi';
import { AppText, Button, Field, Group, Icon, LargeTitle, Row, Screen, Select, Sheet } from '@/design/components';
import { colors, radius, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { useStateChoice } from '@/features/common/useStateChoice';

/** Parties: list (with the states each works in, spec party-states A3), add a party, give an AC to a party (with max zones). */
export default function Parties() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['parties'], queryFn: platformApi.parties });
  const [name, setName] = useState('');
  const [short, setShort] = useState('');
  const [party, setParty] = useState<string | null>(null);
  const states = useQuery({ queryKey: ['overview'], queryFn: platformApi.overview }).data?.states ?? [];
  const [state, setState] = useStateChoice(states.map((x) => x.code));
  const [editing, setEditing] = useState<{ id: string; name: string; states: string[] } | null>(null);
  const stateName = (c: string) => states.find((x) => x.code === c)?.name ?? c;
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
            <Row key={p.id} title={p.shortName ? `${p.name} (${p.shortName})` : p.name}
              subtitle={p.states.length ? p.states.map(stateName).join(', ') : t('platform.national')}
              value={`${p.acs} ${t('platform.ac')}`} chevron last={i === q.data.length - 1}
              onPress={() => setEditing({ id: p.id, name: p.name, states: p.states })} />
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
          <Select label={t('platform.state')} value={state} onChange={(v) => { setState(v); setAc(null); }} options={states.map((x) => ({ value: x.code, label: x.name }))} />
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
      {editing ? (
        <PartyStates party={editing} states={states} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); done(t('admin.saved')); }} />
      ) : null}
    </Screen>
  );
}

/** spec party-states A3: National (all states) or the states the party works in. */
function PartyStates({ party, states, onClose, onSaved }: {
  party: { id: string; name: string; states: string[] }; states: { code: string; name: string }[]; onClose: () => void; onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<string[]>(party.states);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const toggle = (c: string) => setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  const save = () => {
    setBusy(true);
    platformApi.setPartyStates(party.id, picked).then(onSaved, (e: Error) => { setErr(e.message); setBusy(false); });
  };
  const tick = <Icon name="checkmark" size={22} color={colors.accent} />;
  return (
    <Sheet visible title={party.name} onClose={onClose} footer={t('platform.statesHint')}>
      <Row title={t('platform.national')} subtitle={t('platform.nationalSub')} trailing={picked.length ? null : tick}
        a11yLabel={`${t('platform.national')}${picked.length ? '' : ', ✓'}`} onPress={() => setPicked([])} />
      {states.map((x, i) => (
        <Row key={x.code} title={x.name} trailing={picked.includes(x.code) ? tick : null} last={i === states.length - 1}
          a11yLabel={`${x.name}${picked.includes(x.code) ? ', ✓' : ''}`} onPress={() => toggle(x.code)} />
      ))}
      <View style={s.form}>
        {err ? <AppText variant="callout" color={colors.danger}>{err}</AppText> : null}
        <Button block label={t('admin.save')} disabled={busy} onPress={save} />
      </View>
    </Sheet>
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
