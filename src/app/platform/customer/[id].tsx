import { useQuery, useQueryClient } from '@tanstack/react-query';
import { openTeamAsAdmin } from '@/features/session/session';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { platformApi, type Customer, type CustomerPatch, type FeatureKey } from '@/api/adminApi';
import { appendFile } from '@/api/upload';
import { AppText, Button, ChoiceRow, Field, Group, Icon, LargeTitle, Row, Screen, SegmentedControl, Sheet } from '@/design/components';
import { useWide } from '@/design/layout';
import { accentFrom, contrastOnWhite } from '@/design/theme';
import { brandSwatches, colors, fonts, radius, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { VolunteerRequests } from '@/features/admin/VolunteerRequests';
import { BrandPreview } from '@/features/customers/BrandPreview';
import { ColourPicker } from '@/features/customers/ColourPicker';
import { fileUrl } from '@/features/session/customer';
import { LANG_LABEL } from '@/i18n';

type Tab = 'look' | 'candidate' | 'features' | 'language' | 'limits' | 'messages' | 'sync' | 'polling';
const FEATURES: FeatureKey[] = ['tasks', 'surnames', 'map', 'zones', 'slip', 'help', 'boothGps', 'poll'];
const PLANS: Record<'basic' | 'pro' | 'all', FeatureKey[]> = {
  basic: ['tasks', 'surnames'],
  pro: ['tasks', 'surnames', 'map', 'zones', 'slip', 'help', 'boothGps'],
  all: FEATURES,
};

/** C1–C7: everything about one customer's app, set by the super-admin, with a live preview. */
export default function CustomerPage() {
  const { t } = useTranslation();
  const [err, setErr] = useState<string | null>(null);
  const wide = useWide();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['customer', id], queryFn: () => platformApi.customer(id), enabled: !!id });
  const all = useQuery({ queryKey: ['customers'], queryFn: platformApi.customers });
  const [tab, setTab] = useState<Tab>('look');
  const [d, setD] = useState<Customer | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the edit form starts from the loaded customer (and reloads after a save)
  useEffect(() => { if (q.data) setD(q.data); }, [q.data]);

  const patch = useMemo<CustomerPatch>(() => {
    if (!d || !q.data) return {};
    const o = q.data;
    const out: Record<string, unknown> = {};
    const keys: (keyof Customer)[] = ['appName', 'colour', 'candidateName', 'ballotNo', 'slogan', 'message', 'slipShareText', 'defaultLang', 'languages', 'maxZones', 'maxVolunteers', 'maxAdmins', 'status', 'validUntil', 'syncMode', 'syncMinutes', 'boothRadiusM'];
    for (const k of keys) if (JSON.stringify(d[k]) !== JSON.stringify(o[k])) out[k] = d[k];
    const f = Object.fromEntries(FEATURES.filter((k) => d.features[k] !== o.features[k]).map((k) => [k, d.features[k]]));
    if (Object.keys(f).length) out.features = f;
    return out as CustomerPatch;
  }, [d, q.data]);
  const dirty = Object.keys(patch).length > 0;
  const set = (p: Partial<Customer>) => { setMsg(null); setD((x) => (x ? { ...x, ...p } : x)); };

  const save = async () => {
    if (!d) return;
    setBusy(true);
    setMsg(null);
    try {
      const saved = await platformApi.saveCustomer(d.id, patch);
      qc.setQueryData(['customer', id], saved);
      void qc.invalidateQueries({ queryKey: ['customers'] });
      setMsg({ ok: true, text: t('cms.saved') });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const upload = async (kind: 'logo' | 'photo' | 'banner') => {
    if (!d) return;
    const r = await DocumentPicker.getDocumentAsync({ type: ['image/png', 'image/jpeg', 'image/webp'], copyToCacheDirectory: true });
    if (r.canceled || !r.assets[0]) return;
    const a = r.assets[0] as DocumentPicker.DocumentPickerAsset & { file?: File };
    const form = new FormData();
    await appendFile(form, 'file', { uri: a.uri, name: a.name, type: a.mimeType ?? 'image/png', file: a.file ?? null });
    setBusy(true);
    setMsg(null);
    try {
      const { url } = await platformApi.uploadImage(d.id, kind, form);
      const key = kind === 'logo' ? 'logoUrl' : kind === 'photo' ? 'candidatePhotoUrl' : 'bannerUrl';
      const next = { ...(q.data as Customer), [key]: url };
      qc.setQueryData(['customer', id], next);
      set({ [key]: url } as Partial<Customer>);
      setMsg({ ok: true, text: t('cms.uploaded') });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (!d) return <Screen back={t('cms.customers')}><QueryState loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} /></Screen>;

  const colourOk = !d.colour || /^#[0-9A-Fa-f]{6}$/.test(d.colour);
  const adjusted = d.colour && colourOk && accentFrom(d.colour) !== d.colour.toUpperCase();
  const others = (all.data ?? []).filter((c) => c.id !== d.id);
  const num = (x: string) => (x.trim() === '' ? null : Number(x.replace(/\D/g, '')));

  const form = (
    <View style={s.formCol}>
      <VolunteerRequests customerId={d.id} />
      <View style={s.tabs}>
        <SegmentedControl<Tab> label={t('cms.sections')} value={tab} onChange={setTab}
          options={(['look', 'candidate', 'features', 'language', 'sync', 'polling', 'limits', 'messages'] as Tab[]).map((k) => ({ value: k, label: t(`cms.tab.${k}`) }))} />
      </View>

      {tab === 'look' ? (
        <Group header={t('cms.tab.look')} footer={t('cms.lookHint')}>
          <View style={s.pad}>
            <Field label={t('cms.appName')} value={d.appName ?? ''} maxLength={30} onChangeText={(x) => set({ appName: x })} placeholder={d.partyName} />
            <ImagePick label={t('cms.logo')} url={d.logoUrl} onPick={() => void upload('logo')} square />
            <ImagePick label={t('banner.title')} url={d.bannerUrl ?? null} onPick={() => void upload('banner')} />
            <AppText variant="footnote" color={colors.textSecondary}>{t('cms.colour')}</AppText>
            <View style={s.swatches}>
              {brandSwatches.map((c) => (
                <Pressable key={c} accessibilityRole="radio" aria-checked={d.colour?.toUpperCase() === c} accessibilityLabel={c} onPress={() => set({ colour: c })}
                  style={[s.sw, { backgroundColor: c }, d.colour?.toUpperCase() === c && s.swOn]}>
                  {d.colour?.toUpperCase() === c ? <Icon name="checkmark" size={18} color={colors.textOnAccent} /> : null}
                </Pressable>
              ))}
            </View>
            <View style={s.hexRow}>
              <View style={s.pickerCol}>
                <AppText variant="footnote" color={colors.textSecondary}>{t('cms.pick')}</AppText>
                <ColourPicker value={d.colour} label={t('cms.pickA11y')} onChange={(hex) => set({ colour: hex })} />
              </View>
              <View style={s.flex}>
                <Field label={t('cms.colourHex')} value={d.colour ?? ''} autoCapitalize="characters" maxLength={7} placeholder={brandSwatches[0]}
                  onChangeText={(x) => set({ colour: x ? (x.startsWith('#') ? x.toUpperCase() : `#${x.toUpperCase()}`) : null })}
                  error={!colourOk ? t('cms.colourBad') : null} hint={adjusted ? t('cms.colourAdjusted', { c: accentFrom(d.colour), r: contrastOnWhite(d.colour!).toFixed(1) }) : undefined} />
              </View>
            </View>
          </View>
        </Group>
      ) : null}

      {tab === 'candidate' ? (
        <Group header={t('cms.tab.candidate')} footer={t('cms.candidateHint')}>
          <View style={s.pad}>
            <Field label={t('cms.candidateName')} value={d.candidateName ?? ''} maxLength={80} onChangeText={(x) => set({ candidateName: x })} />
            <ImagePick label={t('cms.photo')} url={d.candidatePhotoUrl} onPick={() => void upload('photo')} />
            <Field label={t('cms.ballot')} value={d.ballotNo ? String(d.ballotNo) : ''} keyboardType="number-pad" maxLength={2} onChangeText={(x) => set({ ballotNo: num(x) })} />
            <Field label={t('cms.slogan')} value={d.slogan ?? ''} maxLength={80} onChangeText={(x) => set({ slogan: x })} />
          </View>
        </Group>
      ) : null}

      {tab === 'features' ? (
        <>
          <Group header={t('cms.plans')}>
            <View style={[s.pad, s.planRow]}>
              {(['basic', 'pro', 'all'] as const).map((p) => (
                <Button key={p} kind="tinted" compact label={t(`cms.plan.${p}`)} style={s.flex}
                  onPress={() => set({ features: Object.fromEntries(FEATURES.map((k) => [k, PLANS[p].includes(k)])) as Customer['features'] })} />
              ))}
            </View>
          </Group>
          <Group header={t('cms.tab.features')} footer={t('cms.featuresHint')}>
            {FEATURES.map((k, i) => (
              <Row key={k} title={t(`cms.feature.${k}`)} subtitle={t(`cms.featureSub.${k}`)} last={i === FEATURES.length - 1}
                trailing={<Switch value={d.features[k]} onValueChange={(v) => set({ features: { ...d.features, [k]: v } })} accessibilityLabel={t(`cms.feature.${k}`)} trackColor={{ true: colors.success, false: colors.ringTrack }} />} />
            ))}
          </Group>
        </>
      ) : null}

      {tab === 'language' ? (
        <Group header={t('cms.tab.language')} footer={t('cms.langHint')}>
          {(['pa', 'hi', 'en'] as const).map((l, i) => {
            const on = d.languages.includes(l);
            return (
              <Row key={l} title={l === 'en' ? 'English' : `${LANG_LABEL[l]} (${l === 'pa' ? 'Punjabi' : 'Hindi'})`} last={i === 2}
                subtitle={d.defaultLang === l ? t('cms.default') : undefined}
                trailing={
                  <View style={s.langCtl}>
                    {on && d.defaultLang !== l ? <Button kind="plain" compact label={t('cms.makeDefault')} onPress={() => set({ defaultLang: l })} /> : null}
                    <Switch value={on} accessibilityLabel={l} disabled={on && d.languages.length === 1}
                      onValueChange={(v) => {
                        const langs = v ? [...d.languages, l] : d.languages.filter((x) => x !== l);
                        set({ languages: langs, defaultLang: langs.includes(d.defaultLang ?? 'en') ? d.defaultLang : langs[0] });
                      }} trackColor={{ true: colors.success, false: colors.ringTrack }} />
                  </View>
                } />
            );
          })}
        </Group>
      ) : null}

      {tab === 'limits' ? (
        <>
          <Group header={t('cms.subscription')}>
            <View style={s.pad}>
              <SegmentedControl<Customer['status']> label={t('platform.status')} value={d.status} onChange={(v) => set({ status: v })}
                options={(['active', 'paused', 'closed'] as const).map((v) => ({ value: v, label: t(`platform.statuses.${v}`) }))} />
              <Field label={t('cms.validUntil')} value={d.validUntil ?? ''} placeholder="YYYY-MM-DD" maxLength={10} onChangeText={(x) => set({ validUntil: x.trim() || null })}
                error={d.validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(d.validUntil) ? 'YYYY-MM-DD' : null} hint={t('cms.validHint')} />
            </View>
          </Group>
          <Group header={t('cms.limits')} footer={t('cms.limitsHint', { v: d.volunteers, a: d.admins, z: d.zoneCount })}>
            <View style={s.pad}>
              <Field label={t('platform.maxZones')} value={String(d.maxZones)} keyboardType="number-pad" maxLength={2} onChangeText={(x) => set({ maxZones: num(x) ?? 1 })} />
              <Field label={t('cms.maxVolunteers')} value={d.maxVolunteers != null ? String(d.maxVolunteers) : ''} placeholder={t('cms.unlimited')} keyboardType="number-pad" maxLength={6} onChangeText={(x) => set({ maxVolunteers: num(x) })} />
              <Field label={t('cms.maxAdmins')} value={d.maxAdmins != null ? String(d.maxAdmins) : ''} placeholder={t('cms.unlimited')} keyboardType="number-pad" maxLength={3} onChangeText={(x) => set({ maxAdmins: num(x) })} />
            </View>
          </Group>
        </>
      ) : null}

      {tab === 'sync' ? (
        <Group header={t('cms.tab.sync')} footer={t('cms.syncHint')}>
          <View style={s.pad}>
            <AppText variant="footnote" color={colors.textSecondary}>{t('cms.syncMode')}</AppText>
            <SegmentedControl<Customer['syncMode']> label={t('cms.syncMode')} value={d.syncMode} onChange={(v) => set({ syncMode: v })}
              options={(['live', 'offline', 'scheduled'] as const).map((v) => ({ value: v, label: t(`cms.syncOpt.${v}`) }))} />
            <AppText variant="callout" color={colors.textSecondary}>{t(`sync.modeHint.${d.syncMode}`, { n: d.syncMinutes })}</AppText>
            {d.syncMode === 'scheduled' ? (
              <Field label={t('cms.syncMinutes')} value={d.syncMinutes ? String(d.syncMinutes) : ''} keyboardType="number-pad" maxLength={3}
                onChangeText={(x) => set({ syncMinutes: Number(x.replace(/\D/g, '')) || 0 })}
                error={d.syncMinutes < 1 || d.syncMinutes > 120 ? t('cms.syncMinutes') : null} />
            ) : null}
          </View>
        </Group>
      ) : null}

      {tab === 'polling' ? (
        <Group header={t('cms.tab.polling')} footer={t('pd.radiusHint')}>
          <View style={s.pad}>
            <Field label={t('pd.radiusLabel')} value={d.boothRadiusM ? String(d.boothRadiusM) : ''} keyboardType="number-pad" maxLength={4}
              onChangeText={(x) => set({ boothRadiusM: Number(x.replace(/\D/g, '')) || 0 })}
              error={d.boothRadiusM < 50 || d.boothRadiusM > 2000 ? t('pd.radiusRange') : null} />
            <Button kind="tinted" label={t('pd.openPage')} onPress={() => router.push(`/platform/polling/${d.id}`)} />
          </View>
        </Group>
      ) : null}

      {tab === 'messages' ? (
        <Group header={t('cms.tab.messages')}>
          <View style={s.pad}>
            <AppText variant="footnote" color={colors.textSecondary}>{t('cms.message')}</AppText>
            <TextInput value={d.message ?? ''} onChangeText={(x) => set({ message: x })} multiline maxLength={300} accessibilityLabel={t('cms.message')} style={s.area} placeholder={t('cms.messagePh')} placeholderTextColor={colors.textTertiary} />
            <AppText variant="footnote" color={colors.textSecondary}>{t('cms.shareText')}</AppText>
            <TextInput value={d.slipShareText ?? ''} onChangeText={(x) => set({ slipShareText: x })} multiline maxLength={300} accessibilityLabel={t('cms.shareText')} style={s.area} placeholder={t('cms.shareTextPh')} placeholderTextColor={colors.textTertiary} />
            <AppText variant="footnote" color={colors.textSecondary}>{t('cms.shareTextHint')}</AppText>
          </View>
        </Group>
      ) : null}

      <View style={s.actions}>
        <Button label={t('cms.save')} disabled={!dirty || busy || !colourOk || d.syncMinutes < 1 || d.syncMinutes > 120 || d.boothRadiusM < 50 || d.boothRadiusM > 2000} onPress={() => void save()} />
        {dirty ? <Button kind="plain" label={t('cms.discard')} onPress={() => { setD(q.data ?? null); setMsg(null); }} /> : null}
        {msg ? <AppText variant="callout" color={msg.ok ? colors.success : colors.danger} style={s.flex}>{msg.text}</AppText> : null}
      </View>
    </View>
  );

  return (
    <Screen back={t('cms.customers')} trailing={
      <View style={s.trail}>
        <Button compact label={t('asAdmin.open')} onPress={() => void openTeamAsAdmin(d.id).catch((e: Error) => setErr(e.message))} />
        <Button kind="tinted" compact label={t('cms.copyFrom')} onPress={() => setCopyOpen(true)} />
        <Button kind="tinted" compact label={t('cms.teamData')} onPress={() => router.push({ pathname: '/platform/party-ac/[id]', params: { id: d.id } })} />
      </View>
    }>
      <LargeTitle title={d.appName || d.partyName} subtitle={`${d.partyName} · ${d.stateCode} ${d.acNo} ${d.acName}`} />
      {err ? <AppText variant="footnote" color={colors.danger} style={{ paddingHorizontal: spacing.xl }}>{err}</AppText> : null}
      {wide ? (
        <View style={s.split}>
          {form}
          <View style={s.previewCol}>
            <AppText variant="headline" style={s.previewTitle}>{t('cms.preview')}</AppText>
            <BrandPreview look={{ ...d }} />
            <AppText variant="footnote" color={colors.textSecondary} align="center" style={s.previewNote}>{t('cms.previewNote')}</AppText>
          </View>
        </View>
      ) : (
        <>
          {form}
          <Group header={t('cms.preview')}><View style={s.pad}><BrandPreview look={{ ...d }} /></View></Group>
          <View style={s.pad}>
            <Button kind="tinted" label={t('cms.copyFrom')} onPress={() => setCopyOpen(true)} />
            <Button kind="tinted" label={t('cms.teamData')} onPress={() => router.push({ pathname: '/platform/party-ac/[id]', params: { id: d.id } })} />
          </View>
        </>
      )}
      <Sheet visible={copyOpen} title={t('cms.copyFrom')} onClose={() => setCopyOpen(false)} footer={t('cms.copyHint')}>
        {others.map((c, i) => (
          <ChoiceRow key={c.id} title={c.appName || c.partyName} subtitle={`${c.partyName} · ${c.stateCode} ${c.acNo} ${c.acName}`} selected={false} last={i === others.length - 1}
            onPress={() => {
              setCopyOpen(false);
              void platformApi.copyCustomer(d.id, c.id).then((saved) => { qc.setQueryData(['customer', id], saved); setMsg({ ok: true, text: t('cms.copied', { name: c.appName || c.partyName }) }); }, (e: Error) => setMsg({ ok: false, text: e.message }));
            }} />
        ))}
      </Sheet>
    </Screen>
  );
}

function ImagePick({ label, url, onPick, square }: { label: string; url: string | null; onPick: () => void; square?: boolean }) {
  const { t } = useTranslation();
  const src = fileUrl(url);
  return (
    <View style={s.pick}>
      {src ? <Image source={{ uri: src }} style={[s.thumb, !square && s.round]} accessibilityLabel={label} /> : <View style={[s.thumb, !square && s.round, s.empty]}><Icon name="image-outline" size={22} color={colors.textTertiary} /></View>}
      <View style={s.flex}>
        <AppText variant="callout" weight="semibold">{label}</AppText>
        <AppText variant="footnote" color={colors.textSecondary}>{t('cms.imageHint')}</AppText>
      </View>
      <Button kind="tinted" compact label={src ? t('cms.change') : t('cms.upload')} onPress={onPick} />
    </View>
  );
}

const s = StyleSheet.create({
  split: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  formCol: { flex: 1, minWidth: 0 },
  previewCol: { width: 340, paddingTop: spacing.xl, paddingRight: spacing.lg },
  previewTitle: { paddingBottom: spacing.md },
  previewNote: { paddingTop: spacing.md },
  tabs: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  pad: { padding: spacing.lg, gap: spacing.md },
  hexRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  pickerCol: { gap: 6, paddingTop: 2 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sw: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  swOn: { borderWidth: 3, borderColor: colors.surface, shadowColor: colors.text, shadowOpacity: 0.3, shadowRadius: 3 },
  planRow: { flexDirection: 'row' },
  flex: { flex: 1, minWidth: 0 },
  langCtl: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  area: { minHeight: 88, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.separator, backgroundColor: colors.surface, fontFamily: fonts.regular, fontSize: 15, color: colors.text, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, flexWrap: 'wrap' },
  trail: { flexDirection: 'row', gap: spacing.sm },
  pick: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.fill },
  round: { borderRadius: 28 },
  empty: { alignItems: 'center', justifyContent: 'center' },
});
