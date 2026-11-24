import { useQuery, useQueryClient } from '@tanstack/react-query';
import { themed } from '@/design/theme';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { platformApi, type TeamPerson } from '@/api/adminApi';
import { AppText, Button, Field, Group, Icon, LargeTitle, Row, Screen, SegmentedControl, Sheet } from '@/design/components';
import { colors, spacing } from "@/design/tokens";
import { QueryState } from '@/features/common/QueryState';
import { firebaseOn } from '@/features/auth/firebaseAuth';

/** One party in one AC: max zones, status, admins, and the guarded "clear data" action. */
export default function PartyAc() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const o = useQuery({ queryKey: ['overview'], queryFn: platformApi.overview });
  const pa = o.data?.partyAcs.find((p) => p.id === id);
  // spec admin-views S1–S3 / G2: people of this team and the levels the admin may view by.
  const people = useQuery({ queryKey: ['members', id], queryFn: () => platformApi.members(id), enabled: !!id });
  const cust = useQuery({ queryKey: ['customer', id], queryFn: () => platformApi.customer(id), enabled: !!id });
  const [role, setRole] = useState<'admin' | 'volunteer'>('volunteer');
  const [boothsText, setBoothsText] = useState('');
  const [editing, setEditing] = useState<TeamPerson | null>(null);
  const [removing, setRemoving] = useState<TeamPerson | null>(null);
  const parseBooths = (x: string) => [...new Set(x.split(/[\s,]+/).map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const byEmail = firebaseOn(); // spec accounts-access AC12
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const [passKey, setPassKey] = useState('');
  const [typed, setTyped] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['overview'] });
    void qc.invalidateQueries({ queryKey: ['admins'] });
    void qc.invalidateQueries({ queryKey: ['members', id] });
    void qc.invalidateQueries({ queryKey: ['customer', id] });
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

      {/* spec admin-views G2: what the admin may view the assembly by. */}
      <Group header={t('steam.views')} footer={t('steam.viewsHint')}>
        {(['zone', 'area', 'village'] as const).map((v, i) => {
          const cur = cust.data?.views ?? ['zone'];
          const on = cur.includes(v);
          return (
            <Row key={v} title={t(`allb.${v}`)} last={i === 2} a11yLabel={`${t(`allb.${v}`)}${on ? ', ✓' : ''}`}
              trailing={on ? <Icon name="checkmark" size={22} color={colors.accent} /> : null}
              onPress={() => {
                const next = on ? cur.filter((x) => x !== v) : [...cur, v];
                if (!next.length) return setMsg({ ok: false, text: t('steam.oneView') });
                void platformApi.saveCustomer(id, { views: next }).then(refresh, fail);
              }} />
          );
        })}
      </Group>

      {/* spec admin-views S1–S3: everyone in this team; tap a volunteer to change booths; × removes. */}
      {(['admin', 'volunteer'] as const).map((r) => {
        const list = (people.data ?? []).filter((p) => p.role === r && p.status === 'approved');
        return (
          <Group key={r} header={`${t(r === 'admin' ? 'platform.admins' : 'steam.volunteers')} (${list.length})`}>
            {list.length === 0 ? <Row title={t('steam.none')} last /> : list.map((p, i) => (
              <Row key={p.membershipId} title={p.name} last={i === list.length - 1}
                subtitle={[p.mobile ? `+91 ${p.mobile}` : p.email?.endsWith('.invalid') ? null : p.email, r === 'volunteer' ? t('common.booth', { no: p.booths.join(', ') }) : null].filter(Boolean).join(' · ')}
                trailing={
                  <View style={s.acts}>
                    {r === 'volunteer' ? (
                      <Button kind="plain" compact label={t('steam.booths')} a11yLabel={`${t('steam.booths')} ${p.name}`}
                        onPress={() => { setEditing(p); setBoothsText(p.booths.join(', ')); }} />
                    ) : null}
                    <Pressable accessibilityRole="button" accessibilityLabel={`${t('steam.remove')} ${p.name}`} hitSlop={8} onPress={() => setRemoving(p)}>
                      <Icon name="close-circle" size={22} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                } />
            ))}
          </Group>
        );
      })}

      <Group header={t('steam.add')} footer={t('steam.addHint')}>
        <View style={s.form}>
          <SegmentedControl<'admin' | 'volunteer'> label={t('steam.role')} value={role} onChange={setRole}
            options={[{ value: 'volunteer', label: t('steam.volunteer') }, { value: 'admin', label: t('steam.admin') }]} />
          <Field label={t('platform.name')} value={name} onChangeText={setName} />
          {byEmail ? (
            <Field label={t('auth.email')} value={email} onChangeText={(x) => setEmail(x.trim())} keyboardType="email-address" autoCapitalize="none" hint={t('platform.emailHint')} />
          ) : (
            <Field label={t('platform.mobile')} prefix="+91" value={mobile} keyboardType="number-pad" onChangeText={(x) => setMobile(x.replace(/\D/g, '').slice(0, 10))} />
          )}
          {role === 'volunteer' ? (
            <Field label={t('steam.booths')} value={boothsText} onChangeText={setBoothsText} keyboardType="numbers-and-punctuation" hint={t('steam.boothsHint')} />
          ) : null}
          <Button kind="filled" label={role === 'admin' ? t('platform.addAdmin') : t('steam.addVolunteer')}
            disabled={name.trim().length < 2 || (byEmail ? !emailOk : mobile.length !== 10) || (role === 'volunteer' && !parseBooths(boothsText).length)}
            onPress={() => {
              const who = byEmail ? { email: email.trim() } : { mobile };
              const done = () => { setName(''); setMobile(''); setEmail(''); setBoothsText(''); setMsg({ ok: true, text: t('admin.saved') }); refresh(); };
              void (role === 'admin' ? platformApi.addAdmin(who, name.trim(), pa.id) : platformApi.addVolunteer(who, name.trim(), pa.id, parseBooths(boothsText))).then(done, fail);
            }} />
        </View>
      </Group>

      <Sheet visible={!!editing} title={editing?.name ?? ''} onClose={() => setEditing(null)} footer={t('steam.boothsHint')}>
        <View style={s.form}>
          <Field label={t('steam.booths')} value={boothsText} onChangeText={setBoothsText} keyboardType="numbers-and-punctuation" />
          <Button kind="filled" label={t('admin.save')} disabled={!parseBooths(boothsText).length}
            onPress={() => editing && void platformApi.setMemberBooths(pa.id, editing.membershipId, parseBooths(boothsText)).then(() => { setEditing(null); setMsg({ ok: true, text: t('admin.saved') }); refresh(); }, fail)} />
        </View>
      </Sheet>
      <Sheet visible={!!removing} title={t('steam.removeTitle', { name: removing?.name ?? '' })} onClose={() => setRemoving(null)} footer={t('steam.removeHint')}>
        <View style={s.form}>
          <Button kind="danger" label={t('steam.remove')}
            onPress={() => removing && void platformApi.removeMember(pa.id, removing.membershipId).then(() => { setRemoving(null); setMsg({ ok: true, text: t('steam.removed') }); refresh(); }, fail)} />
          <Button kind="plain" label={t('common.cancel')} onPress={() => setRemoving(null)} />
        </View>
      </Sheet>

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
  acts: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
}));
