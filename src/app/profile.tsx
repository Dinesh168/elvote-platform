import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/api/adminApi';
import { ApiError } from '@/api/http';
import { AppText, Button, Field, LargeTitle, SegmentedControl } from '@/design/components';
import { colors, spacing } from '@/design/tokens';
import { goLanding, logout } from '@/features/session/session';
import { AuthScreen } from '@/features/shell/AuthScreen';
import { initI18n, isLang, LANG_LABEL, LANGS, type Lang } from '@/i18n';
import { isValidMobile } from '@/lib/phone';
import { usePrefs } from '@/stores/prefs';
import { useSession } from '@/stores/session';

/**
 * Your details (spec accounts-access AC4): name and mobile (required, not verified by SMS), app language.
 * Shown once after the first sign-in, before choosing Admin or Volunteer, so every account has a mobile.
 */
export default function Profile() {
  const { t, i18n } = useTranslation();
  const me = useSession((s) => s.me);
  const [name, setName] = useState(me?.user.name ?? '');
  const [mobile, setMobile] = useState(me?.user.mobile ?? '');
  const [lang, setLang] = useState<Lang>(isLang(i18n.language) ? i18n.language : 'en');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ok = name.trim().length >= 2 && isValidMobile(mobile);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await authApi.profile({ name: name.trim(), mobile, lang });
      if (lang !== i18n.language) {
        usePrefs.getState().setLang(lang);
        await initI18n(lang);
      }
      await goLanding();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'mobile_taken') setError(t('profile.mobileTaken'));
      else if (e instanceof ApiError && e.code === 'network') setError(t('auth.network'));
      else setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScreen>
      <LargeTitle title={t('profile.title')} subtitle={t('profile.subtitle')} />
      <View style={s.body}>
        {me?.user.email ? <AppText variant="footnote" color={colors.textSecondary}>{t('profile.signedInAs', { email: me.user.email })}</AppText> : null}
        <Field label={t('profile.name')} value={name} onChangeText={setName} maxLength={80} autoComplete="name" textContentType="name" />
        <Field
          label={t('auth.mobileLabel')}
          prefix="+91"
          value={mobile}
          onChangeText={(x) => setMobile(x.replace(/\D/g, '').slice(0, 10))}
          keyboardType="number-pad"
          maxLength={10}
          autoComplete="tel"
          hint={mobile.length > 0 && !isValidMobile(mobile) ? t('auth.enter10') : t('profile.mobileHint')}
        />
        <SegmentedControl
          label={t('profile.language')}
          value={lang}
          options={LANGS.map((l) => ({ value: l, label: LANG_LABEL[l] }))}
          onChange={(v) => setLang(v as Lang)}
        />
        {error ? <AppText variant="footnote" color={colors.danger}>{error}</AppText> : null}
        <Button block label={t('auth.continue')} disabled={!ok || busy} onPress={() => void save()} />
        <Button kind="plain" label={t('auth.logout')} onPress={() => void logout()} />
      </View>
    </AuthScreen>
  );
}

const s = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.lg, marginTop: spacing.md },
});
