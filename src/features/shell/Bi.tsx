import { View } from 'react-native';
import { AppText } from '@/design/components';
import { colors } from '@/design/tokens';
import { i18n } from '@/i18n';

/** English line with the same line in Hindi underneath, smaller (spec onboarding-branding OB2). */
export function Bi({ k, variant = 'body', weight, align, enColor = colors.text }: {
  k: string; variant?: 'largeTitle' | 'title2' | 'headline' | 'body' | 'callout'; weight?: 'semibold' | 'bold'; align?: 'center'; enColor?: string;
}) {
  const en = i18n.getFixedT('en');
  const hi = i18n.getFixedT('hi');
  return (
    <View style={{ gap: 2 }}>
      <AppText variant={variant} weight={weight} align={align} color={enColor}>{en(k)}</AppText>
      <AppText variant="footnote" align={align} color={colors.textSecondary}>{hi(k)}</AppText>
    </View>
  );
}
