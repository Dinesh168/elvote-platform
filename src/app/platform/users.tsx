import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { platformApi, type AdminUser, type Customer, type UserFilter } from '@/api/adminApi';
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
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const ok = reason.trim().length >= 3;
  const blocked = user.status === 'blocked';

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      const fresh = user.mobile ? (await platformApi.users({ q: user.mobile, limit: 5 })).items : [];
      onChanged(fresh.find((x) => x.id === user.id) ?? null);
      setMsg({ ok: true, text: done });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible title={user.name || (user.mobile ?? '')} onClose={onClose} footer={user.mobile ? `+91 ${user.mobile}${user.isSuperAdmin ? ` · ${t('web.rolePlatform')}` : ''}` : undefined}>
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

const s = StyleSheet.create({
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
