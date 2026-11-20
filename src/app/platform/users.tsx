import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { authApi, platformApi, type AdminUser, type Customer, type UserFilter } from '@/api/adminApi';
import { ApiError } from '@/api/http';
import { AppText, Button, ChoiceRow, DataTable, Field, Group, Icon, LargeTitle, Row, Screen, SegmentedControl, Sheet } from '@/design/components';
import { useWide } from '@/design/layout';
import { colors, fonts, radius, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';

type RoleF = 'all' | 'admin' | 'volunteer' | 'super' | 'blocked';
const PAGE = 50;

/** C8: every person on the platform (newest first) with search, filters and paging; tap one to control their access. */
export default function Users() {
  const { t } = useTranslation();
  const wide = useWide();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [role, setRole] = useState<RoleF>('all');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [pickCustomer, setPickCustomer] = useState(false);
  const [open, setOpen] = useState<AdminUser | null>(null);
  const customers = useQuery({ queryKey: ['customers'], queryFn: platformApi.customers });
  const filter: UserFilter = {
    q: q.length >= 3 ? q : undefined,
    role: role === 'blocked' ? 'all' : role,
    status: role === 'blocked' ? 'blocked' : 'all',
    customer: customer?.id,
    limit: PAGE,
  };
  const r = useInfiniteQuery({
    queryKey: ['users', filter],
    queryFn: ({ pageParam }) => platformApi.users({ ...filter, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.offset + last.items.length < last.total ? last.offset + last.items.length : undefined),
  });
  const rows = r.data?.pages.flatMap((p) => p.items) ?? [];
  const total = r.data?.pages[0]?.total ?? 0;
  const roleText = (u: AdminUser) =>
    u.isSuperAdmin ? t('web.rolePlatform') : u.memberships.map((m) => `${t(m.role === 'admin' ? 'web.roleAdmin' : 'web.roleVolunteer')} · ${m.partyName} ${m.acNo}`).join(', ') || t('users.noTeam');
  const search = () => setQ(text.trim().length >= 3 ? text.trim() : '');

  return (
    <Screen back={t('platform.title')}>
      <LargeTitle title={t('users.title')} subtitle={r.data ? t('users.count', { count: total }) : t('users.sub')} />
      <View style={s.searchWrap}>
        <Icon name="search" size={18} color={colors.textSecondary} />
        <TextInput value={text} onChangeText={(x) => { setText(x); if (!x.trim()) setQ(''); }} onSubmitEditing={search} placeholder={t('users.search')} placeholderTextColor={colors.textTertiary}
          accessibilityLabel={t('users.search')} autoCorrect={false} style={s.search} returnKeyType="search" />
        {q ? <Button kind="plain" compact label={t('users.clear')} onPress={() => { setText(''); setQ(''); }} /> : null}
        <Button compact label={t('users.find')} disabled={text.trim().length < 3} onPress={search} />
      </View>
      <View style={s.filters}>
        <SegmentedControl<RoleF> label={t('users.filter')} value={role} onChange={setRole}
          options={(['all', 'admin', 'volunteer', 'super', 'blocked'] as RoleF[]).map((v) => ({ value: v, label: t(`users.f.${v}`) }))} />
        <Pressable accessibilityRole="button" accessibilityLabel={t('users.customerFilter')} onPress={() => setPickCustomer(true)}
          style={(st) => [s.custBtn, (st as { hovered?: boolean }).hovered && { backgroundColor: colors.fill }]}>
          <Icon name="briefcase-outline" size={16} color={colors.textSecondary} />
          <AppText variant="callout" numberOfLines={1} style={s.custText}>{customer ? `${customer.partyName} · ${customer.stateCode} ${customer.acNo}` : t('users.allCustomers')}</AppText>
          <Icon name="chevron-down" size={16} color={colors.textSecondary} />
        </Pressable>
      </View>
      {!r.data ? (
        <QueryState loading={r.isLoading} error={r.isError} onRetry={() => void r.refetch()} />
      ) : rows.length === 0 ? (
        <AppText variant="callout" color={colors.textSecondary} style={s.hint}>{t('users.none')}</AppText>
      ) : wide ? (
        <View style={s.table}>
          <DataTable rows={rows} rowKey={(u) => u.id} onRowPress={setOpen} rowA11y={(u) => `${u.name}, ${u.mobile ?? ''}, ${u.status}`}
            columns={[
              { key: 'name', label: t('admin.col.name'), flex: 1.6, value: (u) => u.name || '—' },
              { key: 'mobile', label: t('admin.col.mobile'), flex: 1.2, value: (u) => (u.mobile ? `+91 ${u.mobile}` : '—') },
              { key: 'role', label: t('users.teams'), flex: 3, value: (u) => roleText(u) },
              { key: 'status', label: t('platform.status'), flex: 1, value: (u) => u.status, render: (u) => <StatusChip u={u} /> },
            ]} />
        </View>
      ) : (
        <Group>
          {rows.map((u, i) => (
            <Row key={u.id} title={u.name || '—'} subtitle={`${u.mobile ? `+91 ${u.mobile} · ` : ''}${roleText(u)}`} trailing={<StatusChip u={u} />} chevron onPress={() => setOpen(u)} last={i === rows.length - 1} />
          ))}
        </Group>
      )}
      {r.data && rows.length ? (
        <View style={s.more}>
          <AppText variant="footnote" color={colors.textSecondary}>{t('users.showing', { n: rows.length, total })}</AppText>
          {r.hasNextPage ? <Button kind="tinted" compact label={t('users.loadMore')} disabled={r.isFetchingNextPage} onPress={() => void r.fetchNextPage()} /> : null}
        </View>
      ) : null}
      <Sheet visible={pickCustomer} title={t('users.customerFilter')} onClose={() => setPickCustomer(false)}>
        <ChoiceRow title={t('users.allCustomers')} selected={!customer} onPress={() => { setCustomer(null); setPickCustomer(false); }} />
        {(customers.data ?? []).map((c, i, arr) => (
          <ChoiceRow key={c.id} title={c.appName || c.partyName} subtitle={`${c.partyName} · ${c.stateCode} ${c.acNo} ${c.acName}`} selected={customer?.id === c.id}
            onPress={() => { setCustomer(c); setPickCustomer(false); }} last={i === arr.length - 1} />
        ))}
      </Sheet>
      {open ? <UserSheet user={open} onClose={() => setOpen(null)} onChanged={(u) => { setOpen(u); void qc.invalidateQueries({ queryKey: ['users'] }); }} /> : null}
    </Screen>
  );
}

function StatusChip({ u }: { u: AdminUser }) {
  const { t } = useTranslation();
  const blocked = u.status === 'blocked';
  return (
    <View style={[s.chip, { backgroundColor: blocked ? colors.dangerTint : colors.successTint }]}>
      <AppText variant="caption" weight="semibold" color={blocked ? colors.danger : colors.success}>{blocked ? t('users.blocked') : t('users.active')}</AppText>
    </View>
  );
}

/** One person: every action needs a reason (kept on the server, not shown as a history). */
function UserSheet({ user, onClose, onChanged }: { user: AdminUser; onClose: () => void; onChanged: (u: AdminUser | null) => void }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [booths, setBooths] = useState<Record<string, string>>({});
  const [mobile, setMobile] = useState(user.mobile ?? '');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const ok = reason.trim().length >= 3;
  const blocked = user.status === 'blocked';

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      const key = user.mobile ?? user.email;
      const fresh = key ? (await platformApi.users({ q: key, limit: 5 })).items : [];
      onChanged(fresh.find((x) => x.id === user.id) ?? null);
      setMsg({ ok: true, text: done });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible title={user.name || user.email || (user.mobile ?? '')} onClose={onClose}
      footer={[user.mobile ? `+91 ${user.mobile}` : null, user.email, user.isSuperAdmin ? t('web.rolePlatform') : null].filter(Boolean).join(' · ') || undefined}>
      <View style={s.sheet}>
        {blocked && user.blockedReason ? (
          <View style={s.blockedBox}><Icon name="ban" size={18} color={colors.danger} /><AppText variant="callout" color={colors.danger} style={s.flex}>{t('users.blockedBecause', { reason: user.blockedReason })}</AppText></View>
        ) : null}
        <Field label={t('users.reason')} value={reason} onChangeText={setReason} maxLength={200} hint={t('users.reasonHint')} />
        <View style={s.row}>
          <Button kind={blocked ? 'success' : 'danger'} compact style={s.flex} disabled={!ok || busy} label={blocked ? t('users.unblock') : t('users.block')}
            onPress={() => void run(() => (blocked ? platformApi.unblock(user.id, reason.trim()) : platformApi.block(user.id, reason.trim())), blocked ? t('users.unblocked') : t('users.blockedDone'))} />
          <Button kind="tinted" compact style={s.flex} disabled={busy} label={t('users.signOut')} onPress={() => void run(() => platformApi.signOutUser(user.id), t('users.signedOut'))} />
        </View>
        <View style={s.row}>
          <View style={s.flex}><Field label={t('auth.mobileLabel')} prefix="+91" value={mobile} keyboardType="number-pad" onChangeText={(x) => setMobile(x.replace(/\D/g, '').slice(0, 10))} /></View>
          <Button kind="tinted" compact style={s.saveBooths} disabled={!ok || busy || mobile === (user.mobile ?? '') || (mobile !== '' && mobile.length !== 10)} label={t('users.saveMobile')}
            onPress={() => void run(() => platformApi.setUserMobile(user.id, mobile || null, reason.trim()), t('users.mobileSaved'))} />
        </View>
        <AdminAccessBox userId={user.id} onChanged={() => void run(async () => undefined, t('admin.saved'))} />
        {user.memberships.map((m) => (
          <View key={m.id} style={s.team}>
            <AppText variant="headline">{`${m.partyName} · ${m.stateCode} ${m.acNo} ${m.acName}`}</AppText>
            <AppText variant="footnote" color={colors.textSecondary}>
              {`${t(m.role === 'admin' ? 'web.roleAdmin' : 'web.roleVolunteer')} · ${t(`users.mstatus.${m.status}`)}${m.booths.length ? ` · ${t('common.booth', { no: m.booths.join(', ') })}` : ''}`}
            </AppText>
            <View style={s.row}>
              <Button kind="tinted" compact style={s.flex} disabled={!ok || busy} label={m.role === 'admin' ? t('users.makeVolunteer') : t('users.makeAdmin')}
                onPress={() => void run(() => platformApi.updateMembership(m.id, { reason: reason.trim(), role: m.role === 'admin' ? 'volunteer' : 'admin' }), t('users.roleChanged'))} />
              <Button kind="plain" compact style={s.flex} disabled={!ok || busy} label={t('users.remove')}
                onPress={() => void run(() => platformApi.updateMembership(m.id, { reason: reason.trim(), remove: true }), t('users.removed'))} />
            </View>
            {m.role === 'volunteer' ? (
              <View style={s.row}>
                <View style={s.flex}><Field label={t('users.booths')} value={booths[m.id] ?? m.booths.join(', ')} onChangeText={(x) => setBooths({ ...booths, [m.id]: x.replace(/[^\d, ]/g, '') })} /></View>
                <Button kind="tinted" compact disabled={!ok || busy || booths[m.id] === undefined} label={t('users.saveBooths')} style={s.saveBooths}
                  onPress={() => void run(() => platformApi.updateMembership(m.id, { reason: reason.trim(), booths: (booths[m.id] ?? '').split(/[ ,]+/).filter(Boolean).map(Number) }), t('users.boothsSaved'))} />
              </View>
            ) : null}
          </View>
        ))}
        {msg ? <AppText variant="callout" color={msg.ok ? colors.success : colors.danger}>{msg.text}</AppText> : null}
      </View>
    </Sheet>
  );
}

/** spec accounts-access AC8: whole-state scopes and assemblies this person administers; add or remove. */
function AdminAccessBox({ userId, onChanged }: { userId: string; onChanged: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const acc = useQuery({ queryKey: ['adminAccess', userId], queryFn: () => platformApi.adminAccess(userId) });
  const parties = useQuery({ queryKey: ['platform', 'parties'], queryFn: platformApi.parties });
  const states = useQuery({ queryKey: ['catalog', 'states'], queryFn: authApi.states });
  const [adding, setAdding] = useState(false);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);
  const [whole, setWhole] = useState(true);
  const [acText, setAcText] = useState('');
  const [missing, setMissing] = useState<number[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const acNos = acText.split(/[ ,]+/).filter(Boolean).map(Number).filter((n) => n > 0);
  const done = () => { void qc.invalidateQueries({ queryKey: ['adminAccess', userId] }); onChanged(); };
  const add = async (createMissing = false) => {
    setBusy(true);
    setErr(null);
    try {
      await platformApi.addAdminAccess(userId, { partyId: partyId!, stateCode: state!, wholeState: whole, acNos: whole ? undefined : acNos, createMissing });
      setAdding(false);
      setMissing(null);
      setAcText('');
      done();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'no_customer') setMissing((e.details as { acNos: number[] }).acNos);
      else setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const a = acc.data;
  return (
    <View style={s.team}>
      <AppText variant="headline">{t('users.adminAccess')}</AppText>
      {a?.states.map((x) => (
        <View key={`${x.partyId}${x.stateCode}`} style={s.row}>
          <AppText variant="callout" style={s.flex}>{t('users.wholeStateOf', { party: x.partyName, state: x.stateCode })}</AppText>
          <Button kind="plain" compact label={t('users.remove')} disabled={busy}
            onPress={() => void platformApi.removeStateAccess(userId, x.partyId, x.stateCode).then(done, (e: Error) => setErr(e.message))} />
        </View>
      ))}
      {a?.assemblies.filter((x) => x.source === 'direct').map((x) => (
        <AppText key={x.membershipId} variant="callout">{`${x.partyName} · ${x.stateCode} ${x.acNo} ${x.acName}`}</AppText>
      ))}
      {a && !a.states.length && !a.assemblies.length ? <AppText variant="footnote" color={colors.textSecondary}>{t('users.noAdminAccess')}</AppText> : null}
      {!adding ? <Button kind="tinted" compact label={t('users.addAccess')} onPress={() => setAdding(true)} /> : (
        <View style={s.addBox}>
          <AppText variant="footnote" color={colors.textSecondary}>{t('requests.party').toLocaleUpperCase()}</AppText>
          <View style={s.chips}>{(parties.data ?? []).map((p) => (
            <Button key={p.id} compact kind={partyId === p.id ? 'filled' : 'tinted'} label={p.name} onPress={() => setPartyId(p.id)} />
          ))}</View>
          <AppText variant="footnote" color={colors.textSecondary}>{t('registerAdmin.state').toLocaleUpperCase()}</AppText>
          <View style={s.chips}>{(states.data ?? []).map((x) => (
            <Button key={x.code} compact kind={state === x.code ? 'filled' : 'tinted'} label={x.name} onPress={() => setState(x.code)} />
          ))}</View>
          <SegmentedControl label={t('requests.areaLabel')} value={whole ? 'state' : 'acs'} onChange={(v) => setWhole(v === 'state')}
            options={[{ value: 'state', label: t('registerAdmin.wholeState') }, { value: 'acs', label: t('registerAdmin.someAcs') }]} />
          {!whole ? <Field label={t('users.acNumbers')} value={acText} onChangeText={(x) => setAcText(x.replace(/[^\d, ]/g, ''))} hint={t('users.acNumbersHint')} /> : null}
          {missing ? (
            <View style={s.blockedBox}>
              <AppText variant="callout" style={s.flex}>{t('requests.missing', { acs: missing.join(', ') })}</AppText>
              <Button compact label={t('requests.createAndApprove')} disabled={busy} onPress={() => void add(true)} />
            </View>
          ) : null}
          {err ? <AppText variant="footnote" color={colors.danger}>{err}</AppText> : null}
          <View style={s.row}>
            <Button compact style={s.flex} label={t('users.addAccess')} disabled={busy || !partyId || !state || (!whole && !acNos.length)} onPress={() => void add()} />
            <Button compact kind="plain" label={t('users.cancel')} onPress={() => { setAdding(false); setMissing(null); }} />
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  addBox: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.lg, minHeight: 48, paddingLeft: spacing.md, paddingRight: 4, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.separator },
  search: { flex: 1, fontSize: 16, fontFamily: fonts.regular, color: colors.text, paddingVertical: spacing.sm },
  hint: { padding: spacing.xl },
  filters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  custBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.separator, backgroundColor: colors.surface, maxWidth: 320 },
  custText: { flexShrink: 1 },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.xxxl, paddingTop: spacing.md },
  table: { marginTop: spacing.lg },
  chip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  sheet: { padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
  flex: { flex: 1, minWidth: 0 },
  team: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.separator },
  blockedBox: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.dangerTint },
  saveBooths: { marginBottom: 2 },
});
