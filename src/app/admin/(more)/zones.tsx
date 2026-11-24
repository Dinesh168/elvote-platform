import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { adminApi, type Zones as ZonesData } from '@/api/adminApi';
import { AppText, Button, Field, Group, Icon, LargeTitle, Row, Screen, SegmentedControl, Select, Sheet } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, fonts, radius, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { loadMe } from '@/features/session/session';
import { useActiveMembership } from '@/stores/session';

type Zone = ZonesData['zones'][number];

/**
 * spec zones-easy Z1–Z4: make zones in one tap (equal split in booth-number order), rename / add / delete zones, and
 * open a zone to tick its booths (number, name, village; search). Replaces the count stepper + one-booth-at-a-time moves.
 */
export default function Zones() {
  const { t } = useTranslation();
  const m = useActiveMembership();
  const mid = m?.id ?? '';
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['zones', mid], queryFn: () => adminApi.zones(mid), enabled: !!mid });
  const z = q.data;
  const [split, setSplit] = useState<string>('5');
  const [confirm, setConfirm] = useState(false);
  const [editing, setEditing] = useState<Zone | 'unassigned' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['zones', mid] });
    await qc.invalidateQueries({ queryKey: ['dash', mid] });
    await qc.invalidateQueries({ queryKey: ['boothTable', mid] });
    await qc.invalidateQueries({ queryKey: ['map', mid] });
    await loadMe();
  };
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try { await fn(); await refresh(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  if (editing && z) {
    return <ZoneEditor data={z} zone={editing === 'unassigned' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void refresh(); }} />;
  }

  return (
    <Screen width="narrow" back={t('admin.tabs.more')}>
      <LargeTitle title={t('admin.zones')} subtitle={m ? t('admin.acTitle', { no: m.acNo, name: m.acName }) : undefined} />
      {!z ? (
        <QueryState loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <Group header={t('zez.auto')} footer={t('zez.autoHint', { n: z.allBooths.length })}>
            <View style={s.splitRow}>
              <View style={s.flex}>
                <Select label={t('zez.howMany')} value={split} onChange={setSplit}
                  options={Array.from({ length: z.maxZones }, (_, i) => ({ value: String(i + 1), label: t('zez.nZones', { count: i + 1 }) }))} />
              </View>
              <Button kind="filled" label={t('zez.split')} disabled={busy} onPress={() => setConfirm(true)} />
            </View>
          </Group>

          {z.unassigned.length ? (
            <Group>
              <Row title={t('zez.without', { count: z.unassigned.length })} subtitle={t('zez.withoutSub')}
                leading={<Icon name="alert-circle" size={22} color={colors.warning} />} chevron onPress={() => setEditing('unassigned')} last />
            </Group>
          ) : null}

          <Group header={t('zez.list', { count: z.zones.length })} footer={t('zez.listHint')}>
            {z.zones.map((zone, i) => (
              <Row key={zone.id} title={zone.name} last={i === z.zones.length - 1}
                subtitle={`${t('admin.zoneBooths', { n: zone.booths.length })} · ${zone.total ? Math.round((zone.met / zone.total) * 100) : 0}% ${t('allb.met')}`}
                chevron onPress={() => setEditing(zone)} />
            ))}
          </Group>
          <View style={s.pad}>
            <Button kind="tinted" label={`+ ${t('zez.add')}`} disabled={busy || z.zones.length >= z.maxZones}
              onPress={() => void run(() => adminApi.setZoneCount(mid, z.zones.length + 1))} />
            {z.zones.length >= z.maxZones ? <AppText variant="footnote" color={colors.textSecondary}>{t('admin.zoneMax', { max: z.maxZones })}</AppText> : null}
            {error ? <AppText variant="footnote" color={colors.danger}>{error}</AppText> : null}
          </View>

          <Sheet visible={confirm} title={t('zez.confirmTitle', { count: Number(split) })} onClose={() => setConfirm(false)} footer={t('zez.confirmHint')}>
            <View style={s.form}>
              <Button kind="filled" label={t('zez.split')} disabled={busy} onPress={() => { setConfirm(false); void run(() => adminApi.splitZones(mid, Number(split))); }} />
              <Button kind="plain" label={t('common.cancel')} onPress={() => setConfirm(false)} />
            </View>
          </Sheet>
        </>
      )}
    </Screen>
  );
}

type Filter = 'all' | 'here' | 'none';

/** Z3: one zone (or "without a zone"): rename, search, tick booths, Save; Delete zone. */
function ZoneEditor({ data, zone, onClose, onSaved }: { data: ZonesData; zone: Zone | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const mid = useActiveMembership()?.id ?? '';
  const [target, setTarget] = useState<string | null>(zone?.id ?? data.zones[0]?.id ?? null);
  const [name, setName] = useState(zone?.name ?? '');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>(zone ? 'all' : 'none');
  const start = useMemo(() => new Set(zone ? zone.booths : []), [zone]);
  const [ticked, setTicked] = useState<Set<number>>(() => new Set(zone ? zone.booths : []));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const zoneName = useMemo(() => new Map(data.zones.map((x) => [x.id, x.name])), [data.zones]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.allBooths.filter((b) =>
      (filter === 'all' || (filter === 'here' ? ticked.has(b.no) : !b.zoneId)) &&
      (!s || String(b.no).startsWith(s) || b.name.toLowerCase().includes(s) || (b.village ?? '').toLowerCase().includes(s)));
  }, [data.allBooths, q, filter, ticked]);
  const toggle = (no: number) => setTicked((x) => { const n = new Set(x); if (n.has(no)) n.delete(no); else n.add(no); return n; });
  const added = [...ticked].filter((no) => !start.has(no));
  const removed = [...start].filter((no) => !ticked.has(no));
  const changed = added.length + removed.length > 0 || (zone && name.trim() && name.trim() !== zone.name);

  const save = async () => {
    if (!target) return;
    setBusy(true);
    setErr(null);
    try {
      if (zone && name.trim() && name.trim() !== zone.name) await adminApi.renameZone(mid, zone.id, name.trim());
      if (added.length) await adminApi.moveBooths(mid, added, target);
      if (removed.length) await adminApi.moveBooths(mid, removed, null);
      onSaved();
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  };

  return (
    <Screen scroll={false} back={t('admin.zones')} onBack={onClose} width="narrow">
      <View style={s.edTop}>
        {zone ? (
          <Field label={t('zez.name')} value={name} onChangeText={setName} maxLength={40} />
        ) : (
          <Select label={t('zez.putIn')} value={target} onChange={setTarget} options={data.zones.map((x) => ({ value: x.id, label: x.name }))} />
        )}
        <View style={s.search}>
          <Icon name="search" size={18} color={colors.textSecondary} />
          <TextInput value={q} onChangeText={setQ} placeholder={t('zez.search')} placeholderTextColor={colors.textTertiary} style={s.input} autoCorrect={false} accessibilityLabel={t('zez.search')} />
        </View>
        <SegmentedControl<Filter> label={t('zez.show')} value={filter} onChange={setFilter}
          options={[{ value: 'all', label: t('zez.fAll') }, { value: 'here', label: t('zez.fHere', { count: ticked.size }) }, { value: 'none', label: t('zez.fNone') }]} />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(b) => String(b.no)}
        initialNumToRender={30}
        windowSize={8}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item: b }) => {
          const on = ticked.has(b.no);
          const other = b.zoneId && b.zoneId !== zone?.id ? zoneName.get(b.zoneId) : null;
          return (
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${b.no} ${b.name}${other ? `, ${t('zez.inZone', { zone: other })}` : ''}`}
              onPress={() => toggle(b.no)} style={({ pressed }) => [s.row, pressed && { backgroundColor: colors.pressed }]}>
              <Icon name={on ? 'checkbox' : 'square-outline'} size={24} color={on ? colors.accent : colors.textTertiary} />
              <View style={s.flex}>
                <AppText variant="callout" numberOfLines={1}>{`${b.no} · ${b.name}`}</AppText>
                <AppText variant="footnote" color={other && on ? colors.warning : colors.textSecondary} numberOfLines={1}>
                  {[b.village, other ? (on ? t('zez.moveFrom', { zone: other }) : t('zez.inZone', { zone: other })) : null].filter(Boolean).join(' · ')}
                </AppText>
              </View>
            </Pressable>
          );
        }}
      />
      <View style={s.bar}>
        {err ? <AppText variant="footnote" color={colors.danger}>{err}</AppText> : null}
        <View style={s.barRow}>
          {zone ? <Button kind="plain" label={t('zez.delete')} onPress={() => setDel(true)} /> : null}
          <Button kind="filled" style={s.flex} label={changed ? t('zez.save', { added: added.length, removed: removed.length }) : t('zez.nothing')} disabled={!changed || busy || !target} onPress={() => void save()} />
        </View>
      </View>
      {zone ? (
        <Sheet visible={del} title={t('zez.deleteTitle', { zone: zone.name })} onClose={() => setDel(false)} footer={t('zez.deleteHint')}>
          <View style={s.form}>
            <Button kind="danger" label={t('zez.delete')} disabled={busy}
              onPress={() => { setBusy(true); void adminApi.deleteZone(mid, zone.id).then(onSaved, (e: Error) => { setErr(e.message); setBusy(false); setDel(false); }); }} />
            <Button kind="plain" label={t('common.cancel')} onPress={() => setDel(false)} />
          </View>
        </Sheet>
      ) : null}
    </Screen>
  );
}

const s = themed(() => StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pad: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  form: { padding: spacing.lg, gap: spacing.md },
  splitRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, padding: spacing.lg },
  edTop: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.md },
  search: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.fill },
  input: { flex: 1, fontSize: 16, fontFamily: fonts.regular, color: colors.text, paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator, backgroundColor: colors.surface },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
}));
