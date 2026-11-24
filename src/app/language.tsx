import { router } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, ChoiceRow, Group } from '@/design/components';
import { useLayout } from '@/design/layout';
import { themed } from '@/design/theme';
import { colors, spacing } from '@/design/tokens';
import { i18n, initI18n, isLang, LANG_LABEL, LANGS, type Lang } from '@/i18n';
import { usePrefs } from '@/stores/prefs';
import { useActiveMembership, useSession } from '@/stores/session';
import { goBack } from '@/features/shell/navHistory';
import { AuthScreen } from '@/features/shell/AuthScreen';
import { Bi } from '@/features/shell/Bi';

const MARK = require('../../assets/brand/mark.png');

/** The other name under each language (so everyone can read at least one line). */
const SUB: Record<Lang, string> = { pa: 'Punjabi · पंजाबी', hi: 'Hindi', en: 'अंग्रेज़ी' };

/**
 * First launch, step 2 (spec onboarding-branding OB3): choose the app language. Continue saves it on the device as
 * the default and opens Sign in in that language. Website (tablet/desktop): the sign-in frame.
 * Opened from the side menu while signed in: only the team's languages, and Continue goes back to the page you came from.
 */
export default function Language() {
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const wide = layout !== 'phone';
  const start = usePrefs((st) => st.lang);
  const signedIn = useSession((st) => !!st.refreshToken);
  const allowed = useActiveMembership()?.look?.languages;
  const langs = signedIn && allowed?.length ? LANGS.filter((l) => allowed.includes(l)) : LANGS;
  const [lang, setLang] = useState<Lang>(isLang(start) && (signedIn || usePrefs.getState().langChosen) ? start : 'en');
  const done = async () => {
    usePrefs.getState().finishOnboarding(lang);
    await initI18n(lang);
    if (signedIn) goBack();
    else router.replace('/login');
  };
  const head = (
    <View style={s.head}>
      <View style={[s.markTile, wide && s.markTileWide]}><Image source={MARK} style={s.mark} accessibilityLabel="ElVote" /></View>
      <Bi k="lang.title" variant="title2" weight="bold" align="center" />
    </View>
  );
  const list = (
    <Group style={wide ? s.groupWide : undefined}>
      {langs.map((l, i) => (
        <ChoiceRow key={l} title={LANG_LABEL[l]} subtitle={SUB[l]} selected={lang === l} onPress={() => setLang(l)} last={i === langs.length - 1} />
      ))}
    </Group>
  );
  const note = (
    <View style={[s.note, wide && s.noteWide]}>
      <AppText variant="footnote" color={colors.textSecondary}>{i18n.getFixedT('en')('lang.changeLater')}</AppText>
      <AppText variant="footnote" color={colors.textSecondary}>{i18n.getFixedT('hi')('lang.changeLater')}</AppText>
    </View>
  );
  const cta = <Button block label="Continue · जारी रखें" onPress={() => void done()} />;

  if (wide)
    return (
      <AuthScreen>
        <View style={s.card}>
          {head}
          {list}
          {note}
          <View style={s.ctaWide}>{cta}</View>
        </View>
      </AuthScreen>
    );
  return (
    <View style={[s.root, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}>
      {head}
      {list}
      {note}
      <View style={s.flex} />
      <View style={s.pad}>{cta}</View>
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, gap: spacing.lg },
  card: { gap: spacing.lg, paddingVertical: spacing.sm },
  head: { alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.xl },
  markTile: { width: 72, height: 72, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  markTileWide: { backgroundColor: colors.bg },
  mark: { width: 56, height: 56 },
  groupWide: { marginVertical: 0, backgroundColor: colors.bg },
  note: { paddingHorizontal: spacing.xxl, marginTop: -spacing.sm, gap: 2 },
  noteWide: { paddingHorizontal: spacing.xl },
  ctaWide: { paddingHorizontal: spacing.xl },
  pad: { paddingHorizontal: spacing.lg },
  flex: { flex: 1 },
}));
