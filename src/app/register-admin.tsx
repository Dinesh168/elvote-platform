import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/api/adminApi';
import { ApiError } from '@/api/http';
import { AppText, Button, Field, Group, IconSquare, LargeTitle, Row, Select } from '@/design/components';
import { AssemblyPicker } from '@/features/register/AssemblyPicker';
import { themed } from '@/design/theme';
import { colors, spacing } from '@/design/tokens';
import { i18n } from '@/i18n';
import { goLanding } from '@/features/session/session';
import { AuthScreen } from '@/features/shell/AuthScreen';

/** spec admin-request-form A3: positions; the English name is what the super-admin reads. */
const POSITIONS = ['candidate', 'aspirant', 'mla', 'exMla', 'mp', 'stateOb', 'districtOb', 'acIncharge', 'manager', 'coordinator'] as const;
const OTHER = '__other__';

/**
 * Admin request (spec accounts-access AC6, admin-request-form): party (dropdown or typed), state, whole state or assemblies,
 * position (dropdown or typed). The super-admin decides.
 */
export default function RegisterAdmin() {
  const { t } = useTranslation();
  const [party, setParty] = useState<string | null>(null);
  const [typedParty, setTypedParty] = useState('');
  const [position, setPosition] = useState<string | null>(null);
  const [typedPosition, setTypedPosition] = useState('');
  const [picked, setState] = useState<string | null>(null);
  const [whole, setWhole] = useState<boolean | null>(null);
  const [acs, setAcs] = useState<number[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);

  const states = useQuery({ queryKey: ['catalog', 'states'], queryFn: authApi.states });
  // A single state needs no choice (spec states-keyboard A1).
  const state = picked ?? (states.data?.length === 1 ? states.data[0].code : null);
  const parties = useQuery({ queryKey: ['catalog', 'parties'], queryFn: authApi.parties });
  const acList = useQuery({ queryKey: ['catalog', 'acs', state], queryFn: () => authApi.acs(state!), enabled: !!state });

  const listed = (parties.data ?? []).find((p) => p.id === party);
  const partyId = listed?.id;
  const partyName = party === OTHER ? typedParty.trim() : listed?.name ?? '';
  const designation = position === OTHER ? typedPosition.trim() : position ? i18n.getFixedT('en')(`registerAdmin.pos.${position}`) : '';
  const ok = partyName.length >= 2 && !!state && (whole === true || (whole === false && acs.length > 0)) && designation.length >= 2;

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await authApi.accessRequest({
        partyId, partyName, stateCode: state!, wholeState: whole === true,
        acNos: whole ? undefined : acs, designation, note: note.trim() || undefined,
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
        <Select label={t('registerAdmin.partyPick')} value={party} placeholder={t('registerAdmin.pickParty')} searchable onChange={setParty}
          options={[...(parties.data ?? []).map((p) => ({ value: p.id, label: p.name })), { value: OTHER, label: t('registerAdmin.notListed') }]} />
        {party === OTHER ? <Field label={t('registerAdmin.party')} value={typedParty} onChangeText={setTypedParty} maxLength={100} autoFocus /> : null}

        <Select label={t('registerAdmin.state')} value={state} placeholder={t('registerAdmin.pickState')}
          options={(states.data ?? []).map((st) => ({ value: st.code, label: st.name }))}
          onChange={(v) => { setState(v); setAcs([]); setWhole(null); }} />

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

        <Select label={t('registerAdmin.designation')} value={position} placeholder={t('registerAdmin.pickPosition')} onChange={setPosition}
          options={[...POSITIONS.map((k) => ({ value: k, label: t(`registerAdmin.pos.${k}`), subtitle: t(`registerAdmin.who.${k}`) })),
            { value: OTHER, label: t('registerAdmin.pos.other') }]} />
        {position === OTHER ? <Field label={t('registerAdmin.posOther')} value={typedPosition} onChangeText={setTypedPosition} maxLength={80} hint={t('registerAdmin.designationHint')} autoFocus /> : null}
        <Field label={t('registerAdmin.note')} value={note} onChangeText={setNote} maxLength={300} multiline />
        {error ? <AppText variant="footnote" color={colors.danger}>{error}</AppText> : null}
        <Button block label={t('auth.sendRequest')} disabled={!ok || busy} onPress={() => void send()} />
      </View>
    </AuthScreen>
  );
}

const s = themed(() => StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.lg, marginTop: spacing.md },
}));
