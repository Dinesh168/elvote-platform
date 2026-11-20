import { Redirect, router } from 'expo-router';
import { themed } from '@/design/theme';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/api/adminApi';
import { ApiError } from '@/api/http';
import { AppText, Button, Field, Icon, LargeTitle } from '@/design/components';
import { colors, radius, spacing } from '@/design/tokens';
import { clearDeviceCache } from '@/features/data';
import { authMessage, isCancelled } from '@/features/auth/errors';
import { firebaseOn, freshToken, signInMethod, signOutFirebase } from '@/features/auth/firebaseAuth';
import { ensureSynced, unsentCount } from '@/features/session/session';
import { AuthScreen } from '@/features/shell/AuthScreen';
import { useNotice } from '@/stores/notice';
import { useSession } from '@/stores/session';
import { localeOf } from '@/i18n';

type Ac = { stateCode: string; acNo: number; acName: string; partyName: string };

/**
 * AD5: delete my account (volunteer and admin). Type DELETE, then confirm it is you: sign in again with Google or the
 * password (spec accounts-access AC13), or the server's test code locally. Erased after 7 days unless they sign in again.
 */
export default function DeleteAccount() {
  const { t, i18n } = useTranslation();
  const me = useSession((s) => s.me);
  const [word, setWord] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fb = firebaseOn();
  const [method, setMethod] = useState<'google' | 'password' | null>(null);
  const [password, setPassword] = useState('');
  useEffect(() => { if (fb) void signInMethod().then(setMethod); }, [fb]);
  if (!me) return <Redirect href="/" />;
  const mobile = me.user.mobile;

  const fail = (e: unknown) => {
    if (e instanceof ApiError && e.code === 'last_admin') {
      const acs = ((e.details as { acs?: Ac[] } | undefined)?.acs ?? []).map((a) => `AC ${a.acNo} ${a.acName} (${a.partyName})`).join(', ');
      setError(t('del.lastAdmin', { acs }));
    } else if (e instanceof ApiError && e.code === 'otp_invalid') setError(t('del.wrongCode'));
    else if (e instanceof ApiError && (e.code === 'reauth_required' || e.code === 'reauth_mismatch')) setError(t('del.reauth'));
    else if (!(e instanceof ApiError) && fb) { if (!isCancelled(e)) setError(authMessage(e, t)); }
    else if (e instanceof ApiError && e.code === 'network') setError(t('auth.network'));
    else setError((e as Error).message);
  };

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await authApi.deleteCode();
      setDevCode(r.devCode);
      setSent(true);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    // Sync-modes S7: send unsent changes first; never delete an account with work still on the phone.
    if (!(await ensureSynced())) { setBusy(false); return setError(t('sync.unsentBlock', { count: unsentCount() })); }
    try {
      const r = fb ? await authApi.deleteWithToken(await freshToken(method === 'password' ? password : undefined)) : await authApi.deleteAccount(code);
      if (fb) await signOutFirebase();
      const date = new Date(r.dueAt).toLocaleDateString(localeOf(i18n.language), { day: 'numeric', month: 'long', year: 'numeric' });
      // The server has already signed this account out everywhere; clear this device too.
      await clearDeviceCache();
      await useSession.getState().signOut();
      useNotice.getState().show(t('del.done', { date }));
      router.replace('/login');
    } catch (e) {
      fail(e);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const wordOk = word.trim() === 'DELETE';
  return (
    <AuthScreen back={t('common.back')}>
      <LargeTitle title={t('del.title')} subtitle={t('del.sub')} />
      <View style={s.body}>
        <View style={s.info}>
          {(['what1', 'what2', 'what3'] as const).map((k) => (
            <View key={k} style={s.point}>
              <Icon name={k === 'what3' ? 'arrow-undo-outline' : k === 'what2' ? 'shield-checkmark-outline' : 'trash-outline'} size={20} color={colors.textSecondary} />
              <AppText variant="callout" style={s.flex}>{t(`del.${k}`)}</AppText>
            </View>
          ))}
        </View>
        <Field label={t('del.typeLabel')} value={word} onChangeText={setWord} autoCapitalize="characters" autoCorrect={false} maxLength={10} />
        {fb ? (
          method === 'password' ? (
            <Field label={t('del.passwordLabel')} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="current-password" />
          ) : (
            <AppText variant="callout" color={colors.textSecondary}>{t('del.googleAgain')}</AppText>
          )
        ) : !sent ? (
          <Button block kind="tinted" label={t('del.sendCode', { mobile })} disabled={!wordOk || busy} onPress={() => void send()} />
        ) : (
          <>
            <AppText variant="callout" color={colors.textSecondary}>{t('del.codeSent', { mobile })}</AppText>
            {devCode ? (
              <View style={s.dev}><AppText variant="callout" weight="semibold" color={colors.accent}>{t('auth.devCode', { code: devCode })}</AppText></View>
            ) : null}
            <Field label={t('del.codeLabel')} value={code} onChangeText={(x) => { setCode(x.replace(/\D/g, '').slice(0, 6)); setError(null); }} keyboardType="number-pad" maxLength={6} style={s.code} />
          </>
        )}
        {error ? (
          <View style={s.err} accessibilityRole="alert">
            <Icon name="alert-circle" size={20} color={colors.danger} />
            <AppText variant="callout" color={colors.danger} style={s.flex}>{error}</AppText>
          </View>
        ) : null}
        <Button block kind="danger" label={t('del.confirm')}
          disabled={!wordOk || busy || (fb ? method === 'password' && !password : !sent || code.length !== 6)} onPress={() => void submit()} />
      </View>
    </AuthScreen>
  );
}

const s = themed(() => StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.lg, marginTop: spacing.md },
  info: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.fill },
  point: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  flex: { flex: 1 },
  dev: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.accentTint },
  code: { letterSpacing: 8, fontSize: 24 },
  err: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.dangerTint },
}));
