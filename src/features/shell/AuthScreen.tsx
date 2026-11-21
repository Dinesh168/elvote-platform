import type { ReactNode } from 'react';
import { themed } from '@/design/theme';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, BackLink, Icon, Screen } from '@/design/components';
import { BrandHeader } from './Brand';
import { useLayout } from '@/design/layout';
import { colors, radius, spacing, web } from '@/design/tokens';

const MARK = require('../../../assets/brand/mark.png');


/** W5: sign-in frame. Phone: the normal screen. Web desktop: brand panel + centred form card. */
export function AuthScreen({ children, back }: { children: ReactNode; back?: string }) {
  const { t } = useTranslation();
  const layout = useLayout();
  // spec onboarding-branding OB4/OB5: ElVote branding at the top, no language button (chosen at first launch).
  if (layout === 'phone') return <Screen back={back}><BrandHeader />{children}</Screen>;
  return (
    <View style={s.root}>
      {layout === 'desktop' ? (
        <View style={s.brand}>
          <View style={s.logoRow}>
            <View style={s.logo}><Image source={MARK} style={s.mark} accessibilityLabel="ElVote" /></View>
            <AppText variant="title2" color={colors.textOnAccent}>ElVote</AppText>
          </View>
          <View style={s.pitch}>
            <AppText variant="largeTitle" color={colors.textOnAccent} style={s.title}>{t('web.brandTitle')}</AppText>
            {(['brand1', 'brand2', 'brand3'] as const).map((k) => (
              <View key={k} style={s.point}>
                <Icon name="checkmark-circle" size={22} color={colors.textOnAccent} />
                <AppText variant="body" color={colors.textOnAccent} style={s.flex}>{t(`web.${k}`)}</AppText>
              </View>
            ))}
          </View>
          <View />
        </View>
      ) : null}
      <ScrollView style={s.flex} contentContainerStyle={s.formWrap}>
        <View style={s.card}>
          {back ? <View style={s.back}><BackLink label={back} /></View> : null}
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: colors.bg },
  brand: { width: '42%', maxWidth: 560, backgroundColor: colors.accent, padding: 48, justifyContent: 'space-between' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logo: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 36, height: 36 },
  pitch: { gap: spacing.lg, maxWidth: 420 },
  title: { fontSize: 36, lineHeight: 44, marginBottom: spacing.sm },
  point: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  formWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl },
  back: { paddingHorizontal: spacing.sm },
  card: { width: '100%', maxWidth: 440, backgroundColor: colors.surface, borderRadius: radius.lg + 4, borderWidth: 1, borderColor: web.border, paddingVertical: spacing.lg, overflow: 'hidden' },
}));
