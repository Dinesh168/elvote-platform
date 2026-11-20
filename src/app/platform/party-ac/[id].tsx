import { useQuery, useQueryClient } from '@tanstack/react-query';
import { themed } from '@/design/theme';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { platformApi } from '@/api/adminApi';
import { AppText, Button, Field, Group, Icon, LargeTitle, Row, Screen, SegmentedControl } from '@/design/components';
import { colors, spacing } from "@/design/tokens";
import { QueryState } from '@/features/common/QueryState';

/** One party in one AC: max zones, status, admins, and the guarded "clear data" action. */
export default function PartyAc() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const o = useQuery({ queryKey: ['overview'], queryFn: platformApi.overview });
  const admins = useQuery({ queryKey: ['admins'], queryFn: platformApi.admins });
  const pa = o.data?.partyAcs.find((p) => p.id === id);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [passKey, setPassKey] = useState('');
  const [typed, setTyped] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['overview'] });
    void qc.invalidateQueries({ queryKey: ['admins'] });
  };
  const fail = (e: Error) => setMsg({ ok: false, text: e.message });
  if (!pa) return <Screen back={t('platform.title')}><QueryState loading={o.isLoading} error={o.isError || !!o.data} onRetry={() => void o.refetch()} /></Screen>;

  const setMax = (n: number) => void platformApi.updatePartyAc(pa.id, { maxZones: n }).then(refresh, fail);
  return (
    <Screen back={t('platform.title')}>
      <LargeTitle title={pa.partyName} subtitle={`${pa.stateCode} · ${t('platform.acRow', { no: pa.acNo, name: pa.acName })}`} />
      {msg ? <AppText variant="callout" color={msg.ok ? colors.success : colors.danger} style={s.msg}>{msg.text}</AppText> : null}

      <Group header={t('platform.maxZones')} footer={t('platform.maxZonesHint', { used: pa.zoneCount })}>
        <View style={s.stepper}>
          <Step icon="remove" disabled={pa.maxZones <= Math.max(1, pa.zoneCount)} onPress={() => setMax(pa.maxZones - 1)} />
          <AppText variant="largeTitle" tabular style={s.count}>{String(pa.maxZones)}</AppText>
          <Step icon="add" disabled={pa.maxZones >= 50} onPress={() => setMax(pa.maxZones + 1)} />
        </View>
      </Group>

      <Group header={t('platform.status')} style={{ padding: spacing.md }}>
        <SegmentedControl label={t('platform.status')} value={pa.status} onChange={(v) => void platformApi.updatePartyAc(pa.id, { status: v }).then(refresh, fail)}
          options={(['active', 'paused', 'closed'] as const).map((v) => ({ value: v, label: t(`platform.statuses.${v}`) }))} />
      </Group>

      <Group header={t('platform.admins')}>
        {(admins.data ?? []).filter((a) => a.partyAcId === pa.id).map((a) => (
          <Row key={a.userId} title={a.name} subtitle={`+91 ${a.mobile}`} />
        ))}
        <View style={s.form}>
          <Field label={t('platform.name')} value={name} onChangeText={setName} />
          <Field label={t('platform.mobile')} prefix="+91" value={mobile} keyboardType="number-pad" onChangeText={(x) => setMobile(x.replace(/\D/g, '').slice(0, 10))} />
          <Button kind="tinted" label={t('platform.addAdmin')} disabled={name.trim().length < 2 || mobile.length !== 10}
            onPress={() => void platformApi.addAdmin(mobile, name.trim(), pa.id).then(() => { setName(''); setMobile(''); setMsg({ ok: true, text: t('admin.saved') }); refresh(); }, fail)} />
        </View>
      </Group>

      <Group header={t('platform.danger')} footer={t('platform.clearBody')}>
        <View style={s.form}>
          <AppText variant="headline" color={colors.danger}>{t('platform.clearTitle', { ac: pa.acNo })}</AppText>
          <Field label={t('platform.passKey')} value={passKey} onChangeText={setPassKey} secureTextEntry autoCapitalize="none" />
          <Field label={t('platform.typeAc', { ac: pa.acNo })} value={typed} keyboardType="number-pad" onChangeText={(x) => setTyped(x.replace(/\D/g, ''))} />
          <Button kind="filled" style={{ backgroundColor: colors.danger }} label={t('platform.danger')} disabled={!passKey || Number(typed) !== pa.acNo}
            onPress={() => void platformApi.clearPartyAc(pa.id, passKey, Number(typed)).then((r) => { setPassKey(''); setTyped(''); setMsg({ ok: true, text: t('platform.cleared', { n: r.contacts }) }); refresh(); }, fail)} />
        </View>
      </Group>
    </Screen>
  );
}

function Step({ icon, disabled, onPress }: { icon: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={icon === 'add' ? '+' : '−'} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [s.step, disabled && { opacity: 0.35 }, pressed && { opacity: 0.6 }]}>
      <Icon name={icon} size={28} color={colors.accent} />
    </Pressable>
  );
}

const s = themed(() => StyleSheet.create({
  msg: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xxl, padding: spacing.lg },
  step: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  count: { minWidth: 60, textAlign: 'center' },
  form: { padding: spacing.lg, gap: spacing.md },
}));
