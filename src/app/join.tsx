import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { themed } from '@/design/theme';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/api/adminApi';
import { ApiError } from '@/api/http';
import { AppText, Button, Field, Group, Icon, LargeTitle } from '@/design/components';
import { AuthScreen } from '@/features/shell/AuthScreen';
import { colors, fonts, hairline, radius, spacing } from '@/design/tokens';
import { loadMe } from '@/features/session/session';
import { useSession } from '@/stores/session';
import { cleanCode } from '@/features/join/joinCode';
import { QrScanner } from '@/features/join/QrScanner';

type Ac = Awaited<ReturnType<typeof authApi.checkCode>>;

/**
 * V1 join (spec usability-r2 J1/J2): scan the team QR or type the code → the team is shown read-only (party, state,
 * assembly) → the volunteer picks booths → request sent (admin approves). `/join?code=…` (the QR link) fills the code.
 */
export default function Join() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(cleanCode(typeof params.code === 'string' ? params.code : ''));
  const [ac, setAc] = useState<Ac | null>(null);
  // spec accounts-access AC4: the name comes from Your details (still editable here).
  const [name, setName] = useState(useSession.getState().me?.user.name ?? '');
  const [booths, setBooths] = useState<number[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scan, setScan] = useState(false);
  const states = useQuery({ queryKey: ['catalog', 'states'], queryFn: authApi.states, enabled: !!ac?.stateCode });
  const stateName = states.data?.find((s) => s.code === ac?.stateCode)?.name ?? ac?.stateCode ?? '';

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError && e.code === 'network' ? t('auth.network') : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const check = (c: string) => void run(async () => { setBooths([]); setAc(await authApi.checkCode(c)); });

  // A QR link opened the page: look the team up at once.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one lookup when opened from a QR link
    if (code.length >= 4 && typeof params.code === 'string') check(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (no: number) => setBooths((b) => (b.includes(no) ? b.filter((x) => x !== no) : [...b, no]));
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (ac?.booths ?? []).filter((b) => !s || String(b.no).startsWith(s) || b.name.toLowerCase().includes(s) || (b.village ?? '').toLowerCase().includes(s));
  }, [ac, q]);

  return (
    <AuthScreen back={ac ? t('auth.joinTitle') : t('common.back')} onBack={ac ? () => { setAc(null); setError(null); } : undefined}>
      <LargeTitle title={t('auth.joinTitle')} subtitle={ac ? undefined : t('join.sub')} />
      <View style={s.body}>
        {!ac ? (
          <>
            {Platform.OS !== 'web' ? (
              <>
                <Pressable accessibilityRole="button" accessibilityLabel={t('qr.scanButton')} onPress={() => setScan(true)} style={({ pressed }) => [s.scan, pressed && { opacity: 0.85 }]}>
                  <View style={s.scanIcon}><Icon name="qr-code-outline" size={30} color={colors.textOnAccent} /></View>
                  <View style={s.flex}>
                    <AppText variant="headline" color={colors.textOnAccent}>{t('qr.scanButton')}</AppText>
                    <AppText variant="callout" color={colors.textOnAccent}>{t('qr.scanHint')}</AppText>
                  </View>
                </Pressable>
                <View style={s.or}>
                  <View style={s.orLine} /><AppText variant="footnote" color={colors.textSecondary}>{t('qr.orType')}</AppText><View style={s.orLine} />
                </View>
              </>
            ) : null}
            <Field label={t('auth.joinCode')} value={code} onChangeText={(x) => setCode(cleanCode(x))} autoCapitalize="characters" autoCorrect={false} error={error}
              returnKeyType="go" onSubmitEditing={() => code.length >= 4 && check(code)} />
            <Button block label={t('auth.continue')} disabled={code.length < 4 || busy} onPress={() => check(code)} />
          </>
        ) : (
          <>
            <View style={s.team} accessible accessibilityLabel={`${t('join.yourTeam')}: ${ac.partyName}, ${stateName}, ${t('admin.acTitle', { no: ac.acNo, name: ac.acName })}`}>
              <AppText variant="footnote" color={colors.textSecondary}>{t('join.yourTeam').toLocaleUpperCase()}</AppText>
              <View style={s.teamRow}>
                <View style={s.flex}>
                  <AppText variant="headline">{ac.partyName}</AppText>
                  <AppText variant="callout" color={colors.textSecondary}>{[stateName, t('admin.acTitle', { no: ac.acNo, name: ac.acName })].filter(Boolean).join(' · ')}</AppText>
                </View>
                <Icon name="lock-closed-outline" size={18} color={colors.textSecondary} />
              </View>
            </View>
            {!useSession.getState().me?.user.name?.trim() ? <Field label={t('auth.yourName')} value={name} onChangeText={setName} maxLength={80} /> : null}
            <View style={s.search}>
              <Icon name="search" size={18} color={colors.textSecondary} />
              <TextInput value={q} onChangeText={setQ} placeholder={t('join.searchBooth')} placeholderTextColor={colors.textTertiary} style={s.input} accessibilityLabel={t('join.searchBooth')} />
            </View>
            <Group header={t('join.pickBooths', { n: booths.length })} footer={t('join.boothsFoot')} style={s.group}>
              {shown.map((b, i) => {
                const on = booths.includes(b.no);
                return (
                  <Pressable key={b.no} accessibilityRole="checkbox" accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={`${t('common.booth', { no: b.no })}, ${b.name}`}
                    onPress={() => toggle(b.no)} style={({ pressed }) => [s.row, i < shown.length - 1 && s.rowLine, pressed && { backgroundColor: colors.pressed }]}>
                    <View style={s.flex}>
                      <AppText variant="body">{t('common.booth', { no: b.no })}</AppText>
                      <AppText variant="footnote" color={colors.textSecondary} numberOfLines={1}>{[b.name, b.village].filter(Boolean).join(' · ')}</AppText>
                    </View>
                    <View style={[s.check, on && s.checkOn]}>{on ? <Icon name="checkmark" size={16} color={colors.textOnAccent} /> : null}</View>
                  </Pressable>
                );
              })}
            </Group>
            {error ? <AppText variant="footnote" color={colors.danger}>{error}</AppText> : null}
            <Button
              block
              label={booths.length ? t('join.send', { n: booths.length }) : t('auth.sendRequest')}
              disabled={name.trim().length < 2 || booths.length === 0 || busy}
              onPress={() => void run(async () => {
                await authApi.join(code, name.trim(), booths);
                await loadMe();
                router.replace('/waiting');
              })}
            />
          </>
        )}
      </View>
      <QrScanner visible={scan} onClose={() => setScan(false)} onCode={(c) => { setScan(false); setCode(c); check(c); }} />
    </AuthScreen>
  );
}

const s = themed(() => StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.lg, marginTop: spacing.sm },
  flex: { flex: 1, minWidth: 0 },
  scan: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg, borderRadius: radius.lg + 4, backgroundColor: colors.accent, minHeight: 88 },
  scanIcon: { width: 52, height: 52, borderRadius: radius.md + 2, backgroundColor: colors.onAccentTint, alignItems: 'center', justifyContent: 'center' },
  or: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  orLine: { flex: 1, height: hairline, backgroundColor: colors.separator },
  team: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, gap: 6 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 40, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.fill },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 17, color: colors.text, height: 40 },
  group: { marginHorizontal: -spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52, paddingHorizontal: spacing.lg, paddingVertical: 6 },
  rowLine: { borderBottomWidth: hairline, borderBottomColor: colors.separator },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.chevron, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.success, borderColor: colors.success },
}));
