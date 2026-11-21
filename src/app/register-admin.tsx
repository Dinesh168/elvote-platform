import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/api/adminApi';
import { ApiError } from '@/api/http';
import { AppText, Button, Field, Group, IconSquare, LargeTitle, Row } from '@/design/components';
import { AssemblyPicker } from '@/features/register/AssemblyPicker';
import { themed } from '@/design/theme';
import { colors, radius, spacing } from '@/design/tokens';
import { goLanding } from '@/features/session/session';
import { AuthScreen } from '@/features/shell/AuthScreen';

/** Admin request (spec accounts-access AC6): party, state, whole state or assemblies, position. The super-admin decides. */
export default function RegisterAdmin() {
  const { t } = useTranslation();
  const [partyName, setPartyName] = useState('');
  const [partyId, setPartyId] = useState<string | undefined>();
  const [state, setState] = useState<string | null>(null);
  const [whole, setWhole] = useState<boolean | null>(null);
  const [acs, setAcs] = useState<number[]>([]);
  const [designation, setDesignation] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);

  const states = useQuery({ queryKey: ['catalog', 'states'], queryFn: authApi.states });
  const parties = useQuery({ queryKey: ['catalog', 'parties'], queryFn: authApi.parties });
  const acList = useQuery({ queryKey: ['catalog', 'acs', state], queryFn: () => authApi.acs(state!), enabled: !!state });

  const suggestions = partyName.trim().length >= 2 && !partyId
    ? (parties.data ?? []).filter((p) => p.name.toLowerCase().includes(partyName.trim().toLowerCase())).slice(0, 5)
    : [];
  const ok = partyName.trim().length >= 2 && !!state && (whole === true || (whole === false && acs.length > 0)) && designation.trim().length >= 2;

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await authApi.accessRequest({
        partyId, partyName: partyName.trim(), stateCode: state!, wholeState: whole === true,
        acNos: whole ? undefined : acs, designation: designation.trim(), note: note.trim() || undefined,
      });
      await goLanding();
    } catch (e) {
      setError(e instanceof ApiError && e.code === 'network' ? t('auth.network') : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScreen back={t('common.back')}>
      <LargeTitle title={t('registerAdmin.title')} subtitle={t('registerAdmin.subtitle')} />
      <View style={s.body}>
        <Field label={t('registerAdmin.party')} value={partyName} onChangeText={(x) => { setPartyName(x); setPartyId(undefined); }} maxLength={100} />
        {suggestions.length ? (
          <View style={s.chips}>
            {suggestions.map((p) => <Radio key={p.id} label={p.name} on={false} onPress={() => { setPartyName(p.name); setPartyId(p.id); }} />)}
          </View>
        ) : null}

        <AppText variant="footnote" color={colors.textSecondary}>{t('registerAdmin.state').toLocaleUpperCase()}</AppText>
        <View style={s.chips}>
          {(states.data ?? []).map((st) => <Radio key={st.code} label={st.name} on={state === st.code} onPress={() => { setState(st.code); setAcs([]); setWhole(null); }} />)}
        </View>

        {state ? (
          // spec usability-r2 A1: one row opens the full-screen assembly list (search, districts, whole state).
          <Group header={t('registerAdmin.area')} style={{ marginHorizontal: -spacing.lg }}>
            <Row
              title={t('assemblies.title')}
              value={whole === true ? t('assemblies.wholeShort') : acs.length ? t('assemblies.selected', { n: acs.length }) : t('assemblies.notChosen')}
              leading={<IconSquare name="map" bg={colors.accent} />}
              chevron
              onPress={() => setPicker(true)}
              last
            />
          </Group>
        ) : null}
        {state && acList.data ? (
          <AssemblyPicker
            key={`${state}-${picker}`}
            visible={picker}
            stateName={(states.data ?? []).find((x) => x.code === state)?.name ?? state}
            list={acList.data}
            whole={whole === true}
            selected={acs}
            onClose={() => setPicker(false)}
            onDone={(v) => { setWhole(v.whole); setAcs(v.acs); setPicker(false); }}
          />
        ) : null}

        <Field label={t('registerAdmin.designation')} value={designation} onChangeText={setDesignation} maxLength={80} hint={t('registerAdmin.designationHint')} />
        <Field label={t('registerAdmin.note')} value={note} onChangeText={setNote} maxLength={300} multiline />
        {error ? <AppText variant="footnote" color={colors.danger}>{error}</AppText> : null}
        <Button block label={t('auth.sendRequest')} disabled={!ok || busy} onPress={() => void send()} />
      </View>
    </AuthScreen>
  );
}

function Radio({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: on }} aria-checked={on} onPress={onPress} style={[s.chip, on && s.chipOn]}>
      <AppText variant="callout" weight="semibold" color={on ? colors.textOnAccent : colors.text}>{`${on ? '✓ ' : ''}${label}`}</AppText>
    </Pressable>
  );
}

const s = themed(() => StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.lg, marginTop: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.separator },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
}));
