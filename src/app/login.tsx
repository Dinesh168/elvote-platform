import { useEffect, useState } from 'react';
import { themed } from '@/design/theme';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/api/adminApi';
import { ApiError } from '@/api/http';
import { AppText, Button, Field, Icon, LargeTitle } from '@/design/components';
import { AuthScreen } from '@/features/shell/AuthScreen';
import { colors, radius, spacing } from '@/design/tokens';
import { authMessage, isCancelled } from '@/features/auth/errors';
import {
  emailCreate, emailSignIn, firebaseOn, googleAvailable, googleSignIn, redirectToken, resendVerification, resetPassword, verifiedToken,
} from '@/features/auth/firebaseAuth';
import { goLanding } from '@/features/session/session';
import { isValidMobile } from '@/lib/phone';
import { useNotice } from '@/stores/notice';
import { useSession } from '@/stores/session';

/**
 * Sign-in (spec accounts-access AC1, AC2): Continue with Google, or email + password, through Firebase.
 * Local development and automated tests use the server's test code instead (AUTH_MODE=dev; refused in production).
 */
export default function Login() {
  return firebaseOn() ? <FirebaseLogin /> : <DevLogin />;
}

const MIN_PASSWORD = 8;
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

async function finish(idToken: string, t: (k: string) => string) {
  const r = await authApi.firebase(idToken);
  await useSession.getState().setTokens(r.accessToken, r.refreshToken);
  if (r.deletionCancelled) useNotice.getState().show(t('del.cancelled'));
  await goLanding();
}

function FirebaseLogin() {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<'signin' | 'create' | 'verify' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await fn();
    } catch (e) {
      if (isCancelled(e)) return;
      if (e instanceof ApiError) setError(e.code === 'network' ? t('auth.network') : e.message);
      else setError(authMessage(e, t));
    } finally {
      setBusy(false);
    }
  };

  // Back from Google after a redirect sign-in (pop-ups blocked).
  useEffect(() => {
    void redirectToken().then((tok) => { if (tok) void run(() => finish(tok, t)); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (m: typeof mode) => { setMode(m); setError(null); setInfo(null); setPassword(''); };

  const google = () => run(async () => finish(await googleSignIn(i18n.language), t));

  const signIn = () => run(async () => {
    const r = await emailSignIn(email, password);
    if (r.unverified) { setMode('verify'); return; }
    await finish(r.token!, t);
  });

  const create = () => run(async () => {
    await emailCreate(email, password, i18n.language);
    setMode('verify');
  });

  const checkVerified = () => run(async () => {
    const tok = await verifiedToken();
    if (!tok) { setError(t('auth.notVerified')); return; }
    await finish(tok, t);
  });

  const forgot = () => run(async () => {
    await resetPassword(email, i18n.language);
    setInfo(t('auth.resetSent'));
  });

  if (mode === 'verify') {
    return (
      <AuthScreen>
        <LargeTitle title={t('auth.verifyTitle')} />
        <View style={s.body}>
          <View style={s.iconWrap}><Icon name="mail-unread" size={56} color={colors.accent} /></View>
          <AppText variant="body" align="center">{t('auth.verifyBody', { email: email.trim() })}</AppText>
          {error ? <AppText variant="footnote" color={colors.danger} align="center">{error}</AppText> : null}
          {info ? <AppText variant="footnote" color={colors.successText} align="center">{info}</AppText> : null}
          <Button block label={t('auth.verifiedContinue')} disabled={busy} onPress={() => void checkVerified()} />
          <Button block kind="tinted" label={t('auth.resendLink')} disabled={busy} onPress={() => void run(async () => { await resendVerification(); setInfo(t('auth.linkSent')); })} />
          <Button kind="plain" label={t('auth.useOtherEmail')} onPress={() => go('signin')} />
        </View>
      </AuthScreen>
    );
  }

  const isCreate = mode === 'create';
  const isForgot = mode === 'forgot';
  return (
    <AuthScreen>
      <LargeTitle title={isCreate ? t('auth.createTitle') : isForgot ? t('auth.forgotTitle') : t('auth.title')} subtitle={isForgot ? t('auth.forgotSubtitle') : googleAvailable() ? t('auth.subtitleGoogle') : t('auth.subtitleEmail')} />
      <View style={s.body}>
        {!isForgot && googleAvailable() ? (
          <>
            <Button block kind="tinted" label={t('auth.google')} icon={<Icon name="logo-google" size={20} color={colors.accent} />} disabled={busy} onPress={() => void google()} />
            <View style={s.orRow}>
              <View style={s.line} />
              <AppText variant="footnote" color={colors.textSecondary}>{t('auth.or')}</AppText>
              <View style={s.line} />
            </View>
          </>
        ) : null}
        <Field label={t('auth.email')} value={email} onChangeText={(x) => setEmail(x.trim())} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
        {!isForgot ? (
          <Field
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={isCreate ? 'new-password' : 'current-password'}
            textContentType={isCreate ? 'newPassword' : 'password'}
            hint={isCreate ? t('auth.passwordHint', { n: MIN_PASSWORD }) : undefined}
            onSubmitEditing={() => !busy && (isCreate ? void create() : void signIn())}
          />
        ) : null}
        {error ? <AppText variant="footnote" color={colors.danger}>{error}</AppText> : null}
        {info ? <AppText variant="footnote" color={colors.successText}>{info}</AppText> : null}
        {isCreate ? (
          <Button block label={t('auth.createAccount')} disabled={busy || !emailOk(email) || password.length < MIN_PASSWORD} onPress={() => void create()} />
        ) : isForgot ? (
          <Button block label={t('auth.sendReset')} disabled={busy || !emailOk(email)} onPress={() => void forgot()} />
        ) : (
          <Button block label={t('auth.verify')} disabled={busy || !emailOk(email) || !password} onPress={() => void signIn()} />
        )}
        <View style={s.links}>
          {mode === 'signin' ? (
            <>
              <Button kind="plain" label={t('auth.forgotLink')} onPress={() => go('forgot')} />
              <Button kind="plain" label={t('auth.createLink')} onPress={() => go('create')} />
            </>
          ) : (
            <Button kind="plain" label={t('auth.haveAccount')} onPress={() => go('signin')} />
          )}
        </View>
      </View>
    </AuthScreen>
  );
}

/** Local development and tests: mobile → the server's test code (AUTH_MODE=dev). */
function DevLogin() {
  const { t } = useTranslation();
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'mobile' | 'code'>('mobile');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fail = (e: unknown) => {
    if (e instanceof ApiError) setError(e.code === 'network' ? t('auth.network') : e.code === 'otp_invalid' ? t('auth.wrongCode') : e.message);
    else setError((e as Error).message);
  };

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await authApi.requestOtp(mobile);
      setDevCode(r.devCode);
      setStep('code');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await authApi.verifyOtp(mobile, code);
      await useSession.getState().setTokens(r.accessToken, r.refreshToken);
      if (r.deletionCancelled) useNotice.getState().show(t('del.cancelled'));
      await goLanding();
    } catch (e) {
      fail(e);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const mobileOk = isValidMobile(mobile);
  return (
    <AuthScreen>
      <LargeTitle title={t('auth.title')} subtitle={t('auth.subtitle')} />
      <View style={s.body}>
        {step === 'mobile' ? (
          <>
            <Field
              label={t('auth.mobileLabel')}
              prefix="+91"
              value={mobile}
              onChangeText={(x) => setMobile(x.replace(/\D/g, '').slice(0, 10))}
              keyboardType="number-pad"
              autoFocus
              maxLength={10}
              hint={mobile.length > 0 && !mobileOk ? t('auth.enter10') : t('auth.mobileHint')}
              error={error}
              onSubmitEditing={() => mobileOk && void send()}
            />
            <Button block label={t('auth.sendCode')} disabled={!mobileOk || busy} onPress={() => void send()} />
          </>
        ) : (
          <>
            <AppText variant="callout" color={colors.textSecondary}>{t('auth.codeSent', { mobile })}</AppText>
            {devCode ? (
              <View style={s.dev}>
                <AppText variant="callout" weight="semibold" color={colors.accent}>{t('auth.devCode', { code: devCode })}</AppText>
              </View>
            ) : null}
            <Field
              label={t('auth.codeLabel')}
              value={code}
              onChangeText={(x) => setCode(x.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              autoFocus
              maxLength={6}
              error={error}
              style={s.code}
              onSubmitEditing={() => code.length === 6 && void verify()}
            />
            <Button block label={t('auth.verify')} disabled={code.length !== 6 || busy} onPress={() => void verify()} />
            <Button kind="plain" label={t('auth.changeNumber')} onPress={() => { setStep('mobile'); setCode(''); setError(null); }} />
          </>
        )}
      </View>
    </AuthScreen>
  );
}

const s = themed(() => StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.lg, marginTop: spacing.lg },
  dev: { padding: spacing.md, borderRadius: 10, backgroundColor: colors.accentTint },
  code: { letterSpacing: 8, fontSize: 24 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.separator },
  links: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
  iconWrap: { alignItems: 'center', paddingVertical: spacing.lg, borderRadius: radius.lg },
}));
