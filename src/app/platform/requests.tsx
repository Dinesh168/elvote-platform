import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { authApi, platformApi, type AccessRequestRow } from '@/api/adminApi';
import { ApiError } from '@/api/http';
import { AppText, Button, Field, Group, LargeTitle, Row, Screen, SegmentedControl, Sheet } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, radius, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { PushPrompt } from '@/features/pollingDay/PushPrompt';

const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Admin requests (spec accounts-access AC7): the super-admin approves with party + area, or rejects with a reason. */
export default function Requests() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [show, setShow] = useState<'pending' | 'all'>('pending');
  const q = useQuery({ queryKey: ['accessRequests', show], queryFn: () => platformApi.accessRequests(show) });
  const [open, setOpen] = useState<AccessRequestRow | null>(null);
  const refresh = () => void qc.invalidateQueries({ queryKey: ['accessRequests'] });

  const area = (r: AccessRequestRow) => (r.wholeState ? t('requests.wholeState', { state: r.stateCode }) : t('requests.acs', { state: r.stateCode, acs: r.acNos.join(', ') }));
  return (
    <Screen width="medium" back={t('platform.title')}>
      <LargeTitle title={t('requests.title')} subtitle={t('requests.subtitle')} />
      <View style={s.pad}><PushPrompt reason="requests" /></View>
      <View style={s.pad}>
        <SegmentedControl label={t('requests.show')} value={show} onChange={setShow}
          options={[{ value: 'pending', label: t('requests.pending') }, { value: 'all', label: t('requests.all') }]} />
      </View>
      {!q.data ? (
        <QueryState loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} />
      ) : !q.data.length ? (
        <AppText variant="body" color={colors.textSecondary} style={s.empty}>{t('requests.none')}</AppText>
      ) : (
        <Group>
          {q.data.map((r, i) => (
            <Row
              key={r.id}
              title={`${r.name} · ${r.partyName}`}
              subtitle={[area(r), r.designation, r.mobile ? `+91 ${r.mobile}` : null, r.email, fmt(r.createdAt)].filter(Boolean).join(' · ')}
              value={r.status === 'pending' ? undefined : t(`requests.status_${r.status}`)}
              chevron={r.status === 'pending'}
              onPress={r.status === 'pending' ? () => setOpen(r) : undefined}
              last={i === q.data.length - 1}
            />
          ))}
        </Group>
      )}
      {open ? <Decide req={open} onClose={() => setOpen(null)} onDone={() => { setOpen(null); refresh(); }} /> : null}
    </Screen>
  );
}

function Decide({ req, onClose, onDone }: { req: AccessRequestRow; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const parties = useQuery({ queryKey: ['platform', 'parties'], queryFn: platformApi.parties });
  const match = parties.data?.find((p) => p.id === req.partyId || p.name.toLowerCase() === req.partyName.toLowerCase());
  const [partyId, setPartyId] = useState<string | 'new' | null>(null);
  const chosenParty = partyId ?? match?.id ?? 'new';
  const [whole, setWhole] = useState(req.wholeState);
  const [acs, setAcs] = useState<number[]>(req.acNos);
  const acList = useQuery({ queryKey: ['catalog', 'acs', req.stateCode], queryFn: () => authApi.acs(req.stateCode) });
  const [missing, setMissing] = useState<number[] | null>(null);
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState<'approve' | 'reject'>('approve');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const approve = async (createMissing = false) => {
    setBusy(true);
    setError(null);
    try {
      await platformApi.approveAccess(req.id, {
        ...(chosenParty === 'new' ? { newPartyName: req.partyName } : { partyId: chosenParty }),
        stateCode: req.stateCode, wholeState: whole, acNos: whole ? undefined : acs, createMissing,
      });
      onDone();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'no_customer') setMissing((e.details as { acNos: number[] }).acNos);
      else setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const reject = async () => {
    setBusy(true);
    try {
      await platformApi.rejectAccess(req.id, reason.trim());
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const Chip = ({ label, on, onPress, role = 'radio' }: { label: string; on: boolean; onPress: () => void; role?: 'radio' | 'checkbox' }) => (
    <Pressable accessibilityRole={role} accessibilityLabel={label} accessibilityState={{ checked: on }} aria-checked={on} onPress={onPress} style={[s.chip, on && s.chipOn]}>
      <AppText variant="callout" weight="semibold" color={on ? colors.textOnAccent : colors.text}>{`${on ? '✓ ' : ''}${label}`}</AppText>
    </Pressable>
  );

  return (
    <Sheet visible title={req.name} onClose={onClose}>
      <View style={s.sheet}>
        <AppText variant="callout" color={colors.textSecondary}>
          {[req.designation, req.mobile ? `+91 ${req.mobile}` : null, req.email, req.note].filter(Boolean).join(' · ')}
        </AppText>
        <SegmentedControl label={t('requests.decision')} value={mode} onChange={setMode}
          options={[{ value: 'approve', label: t('requests.approve') }, { value: 'reject', label: t('requests.reject') }]} />
        {mode === 'approve' ? (
          <>
            <AppText variant="footnote" color={colors.textSecondary}>{t('requests.party').toLocaleUpperCase()}</AppText>
            <View style={s.chips}>
              {(parties.data ?? []).map((p) => <Chip key={p.id} label={p.name} on={chosenParty === p.id} onPress={() => setPartyId(p.id)} />)}
              {!match ? <Chip label={t('requests.newParty', { name: req.partyName })} on={chosenParty === 'new'} onPress={() => setPartyId('new')} /> : null}
            </View>
            <AppText variant="footnote" color={colors.textSecondary}>{t('requests.area', { state: req.stateCode }).toLocaleUpperCase()}</AppText>
            <View style={s.chips}>
              <Chip label={t('registerAdmin.wholeState')} on={whole} onPress={() => setWhole(true)} />
              <Chip label={t('registerAdmin.someAcs')} on={!whole} onPress={() => setWhole(false)} />
            </View>
            {!whole ? (
              <View style={s.chips}>
                {(acList.data ?? []).map((a) => {
                  const on = acs.includes(a.acNo);
                  return <Chip key={a.acNo} role="checkbox" label={`${a.acNo} · ${a.name}`} on={on} onPress={() => setAcs((x) => (on ? x.filter((n) => n !== a.acNo) : [...x, a.acNo]))} />;
                })}
              </View>
            ) : null}
            {whole ? <AppText variant="footnote" color={colors.textSecondary}>{t('requests.wholeStateNote')}</AppText> : null}
            {missing ? (
              <View style={s.warn}>
                <AppText variant="callout">{t('requests.missing', { acs: missing.join(', ') })}</AppText>
                <Button compact label={t('requests.createAndApprove')} disabled={busy} onPress={() => void approve(true)} />
              </View>
            ) : null}
            {error ? <AppText variant="footnote" color={colors.danger}>{error}</AppText> : null}
            <Button block label={t('requests.approve')} disabled={busy || (!whole && !acs.length)} onPress={() => void approve()} />
          </>
        ) : (
          <>
            <Field label={t('requests.reason')} value={reason} onChangeText={setReason} maxLength={200} multiline />
            {error ? <AppText variant="footnote" color={colors.danger}>{error}</AppText> : null}
            <Button block kind="danger" label={t('requests.reject')} disabled={busy || reason.trim().length < 2} onPress={() => void reject()} />
          </>
        )}
      </View>
    </Sheet>
  );
}

const s = themed(() => StyleSheet.create({
  pad: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  empty: { padding: spacing.xl, textAlign: 'center' },
  sheet: { gap: spacing.md, padding: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.separator },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  warn: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.dangerTint },
}));
