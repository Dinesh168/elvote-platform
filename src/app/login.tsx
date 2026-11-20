import { useState } from 'react';
import { themed } from '@/design/theme';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/api/adminApi';
import { ApiError } from '@/api/http';
import { AppText, Button, Field, LargeTitle } from '@/design/components';
import { AuthScreen } from '@/features/shell/AuthScreen';
import { colors, spacing } from '@/design/tokens';
import { goLanding } from '@/features/session/session';
import { isValidMobile } from '@/lib/phone';
import { useNotice } from '@/stores/notice';
import { useSession } from '@/stores/session';

/** V1 sign-in: mobile → 6-digit code. In local/test mode the server tells us the code. */
export default function Login() {
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
}));
