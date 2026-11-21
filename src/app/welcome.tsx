import { router } from 'expo-router';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, Icon } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, radius, spacing } from '@/design/tokens';
import { i18n } from '@/i18n';
import { Bi } from '@/features/shell/Bi';

const WORDMARK = require('../../assets/brand/logo-horizontal.png');

const POINTS = [
  { k: 'meet', icon: 'home-outline', bg: colors.accentTint, fg: colors.accent },
  { k: 'offline', icon: 'cloud-offline-outline', bg: colors.accentTint, fg: colors.accent },
  { k: 'poll', icon: 'checkbox-outline', bg: colors.dangerTint, fg: colors.danger },
] as const;

/** First launch, step 1 (spec onboarding-branding OB1): what ElVote is; Continue / Skip → choose language. */
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const go = () => router.replace('/language');
  return (
    <View style={[s.root, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={s.top}>
        <Image source={WORDMARK} style={s.wordmark} resizeMode="contain" accessibilityLabel="ElVote" />
        <Button kind="plain" compact label="Skip · छोड़ें" onPress={go} />
      </View>
      <ScrollView contentContainerStyle={s.body}>
        <View style={s.title}>
          <Bi k="welcome.title" variant="largeTitle" weight="bold" />
          <Bi k="welcome.subtitle" variant="body" enColor={colors.textSecondary} />
        </View>
        {POINTS.map((p) => (
          <View key={p.k} style={s.point}>
            <View style={[s.iconBox, { backgroundColor: p.bg }]}><Icon name={p.icon} size={24} color={p.fg} /></View>
            <View style={s.flex}>
              <Bi k={`welcome.${p.k}Title`} variant="headline" />
              <AppText variant="callout" color={colors.textSecondary}>{i18n.getFixedT('en')(`welcome.${p.k}Body`)}</AppText>
            </View>
          </View>
        ))}
      </ScrollView>
      <Button block label="Continue · जारी रखें" onPress={go} />
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: spacing.xl, gap: spacing.lg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordmark: { width: 132, height: 26 },
  body: { gap: spacing.xl, paddingVertical: spacing.lg },
  title: { gap: spacing.sm },
  point: { flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' },
  iconBox: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0, gap: 2 },
}));
