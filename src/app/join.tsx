import { router } from 'expo-router';
import { themed } from '@/design/theme';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/api/adminApi';
import { ApiError } from '@/api/http';
import { AppText, Button, Field, LargeTitle } from '@/design/components';
import { AuthScreen } from '@/features/shell/AuthScreen';
import { colors, radius, spacing } from '@/design/tokens';
import { loadMe, logout } from '@/features/session/session';
import { useSession } from '@/stores/session';

type Ac = Awaited<ReturnType<typeof authApi.checkCode>>;

/** V1 join: team code → name + booths → request sent (admin approves). */
export default function Join() {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [ac, setAc] = useState<Ac | null>(null);
  // spec accounts-access AC4: the name comes from Your details (still editable here).
  const [name, setName] = useState(useSession.getState().me?.user.name ?? '');
  const [booths, setBooths] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  const toggle = (no: number) => setBooths((b) => (b.includes(no) ? b.filter((x) => x !== no) : [...b, no]));

  return (
    <AuthScreen>
      <LargeTitle title={t('auth.joinTitle')} subtitle={ac ? `${ac.partyName} · ${t('admin.acTitle', { no: ac.acNo, name: ac.acName })}` : t('auth.joinCodeHint')} />
      <View style={s.body}>
        {!ac ? (
          <>
            <Field label={t('auth.joinCode')} value={code} onChangeText={(x) => setCode(x.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20))} autoCapitalize="characters" autoFocus error={error} />
            <Button block label={t('auth.continue')} disabled={code.length < 4 || busy} onPress={() => void run(async () => setAc(await authApi.checkCode(code)))} />
          </>
        ) : (
          <>
            <Field label={t('auth.yourName')} value={name} onChangeText={setName} autoFocus maxLength={80} />
            <AppText variant="footnote" color={colors.textSecondary}>{t('auth.pickBooths').toLocaleUpperCase()}</AppText>
            <View style={s.chips}>
              {ac.booths.map((b) => {
                const on = booths.includes(b.no);
                return (
                  <Pressable key={b.no} accessibilityRole="checkbox" accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={`${t('common.booth', { no: b.no })}, ${b.name}`} onPress={() => toggle(b.no)} style={[s.chip, on && s.chipOn]}>
                    <AppText variant="callout" weight="semibold" color={on ? colors.textOnAccent : colors.text}>{`${on ? '✓ ' : ''}${b.no}`}</AppText>
                  </Pressable>
                );
              })}
            </View>
            {error ? <AppText variant="footnote" color={colors.danger}>{error}</AppText> : null}
            <Button
              label={t('auth.sendRequest')}
              disabled={name.trim().length < 2 || booths.length === 0 || busy}
              onPress={() => void run(async () => {
                await authApi.join(code, name.trim(), booths);
                await loadMe();
                router.replace('/waiting');
              })}
            />
          </>
        )}
        <Button kind="plain" label={t('auth.logout')} onPress={() => void logout()} />
      </View>
    </AuthScreen>
  );
}

const s = themed(() => StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.lg, marginTop: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minWidth: 64, height: 44, paddingHorizontal: spacing.md, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.separator },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
}));
