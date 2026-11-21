import { router } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, ChoiceRow, Group } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, spacing } from '@/design/tokens';
import { i18n, initI18n, isLang, LANG_LABEL, LANGS, type Lang } from '@/i18n';
import { usePrefs } from '@/stores/prefs';
import { Bi } from '@/features/shell/Bi';

const MARK = require('../../assets/brand/mark.png');

/** The other name under each language (so everyone can read at least one line). */
const SUB: Record<Lang, string> = { pa: 'Punjabi · पंजाबी', hi: 'Hindi', en: 'अंग्रेज़ी' };

/**
 * First launch, step 2 (spec onboarding-branding OB3): choose the app language. Continue saves it on the device as
 * the default and opens Sign in in that language.
 */
export default function Language() {
  const insets = useSafeAreaInsets();
  const start = usePrefs((st) => st.lang);
  const [lang, setLang] = useState<Lang>(isLang(start) && usePrefs.getState().langChosen ? start : 'en');
  const done = async () => {
    usePrefs.getState().finishOnboarding(lang);
    await initI18n(lang);
    router.replace('/login');
  };
  return (
    <View style={[s.root, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={s.head}>
        <View style={s.markTile}><Image source={MARK} style={s.mark} accessibilityLabel="ElVote" /></View>
        <Bi k="lang.title" variant="title2" weight="bold" align="center" />
      </View>
      <Group>
        {LANGS.map((l, i) => (
          <ChoiceRow key={l} title={LANG_LABEL[l]} subtitle={SUB[l]} selected={lang === l} onPress={() => setLang(l)} last={i === LANGS.length - 1} />
        ))}
      </Group>
      <View style={s.note}>
        <AppText variant="footnote" color={colors.textSecondary}>{i18n.getFixedT('en')('lang.changeLater')}</AppText>
        <AppText variant="footnote" color={colors.textSecondary}>{i18n.getFixedT('hi')('lang.changeLater')}</AppText>
      </View>
      <View style={s.flex} />
      <View style={s.pad}>
        <Button block label="Continue · जारी रखें" onPress={() => void done()} />
      </View>
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, gap: spacing.lg },
  head: { alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.xl },
  markTile: { width: 72, height: 72, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 56, height: 56 },
  note: { paddingHorizontal: spacing.xxl, marginTop: -spacing.sm, gap: 2 },
  pad: { paddingHorizontal: spacing.lg },
  flex: { flex: 1 },
}));
