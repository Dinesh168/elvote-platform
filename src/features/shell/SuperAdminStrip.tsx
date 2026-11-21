/**
 * Shown on every admin page while the super-admin works inside a team (spec usability-r2 S2): who they are acting as,
 * and Exit back to the Overview.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AppText, Icon } from '@/design/components';
import { useWide } from '@/design/layout';
import { colors, spacing } from '@/design/tokens';
import { exitTeam } from '@/features/session/session';
import { useActiveMembership } from '@/stores/session';

export function SuperAdminStrip() {
  const { t } = useTranslation();
  const m = useActiveMembership();
  const insets = useSafeAreaInsets();
  const wide = useWide();
  if (!m?.asSuperAdmin) return null;
  return (
    <View style={[s.strip, { paddingTop: wide ? 6 : insets.top + 4 }]} accessibilityRole="summary">
      <Icon name="shield-checkmark" size={16} color={colors.textOnAccent} />
      <AppText variant="footnote" weight="semibold" color={colors.textOnAccent} numberOfLines={1} style={s.flex}>
        {t('asAdmin.strip', { team: `${m.look?.appName || m.partyName} · AC ${m.acNo}` })}
      </AppText>
      <Pressable accessibilityRole="button" onPress={() => void exitTeam()} hitSlop={8} style={s.exit}>
        <AppText variant="footnote" weight="bold" color={colors.textOnAccent}>{t('asAdmin.exit')}</AppText>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: 6, backgroundColor: colors.text },
  flex: { flex: 1, minWidth: 0 },
  exit: { minHeight: 32, paddingHorizontal: spacing.md, justifyContent: 'center', borderRadius: 16, backgroundColor: colors.onAccentTint },
});
