/**
 * The team's banner photo (spec onboarding-branding OB8): full width, 2:1, rounded, at the top of the volunteer Home
 * and the admin Dashboard. Nothing is shown when the team has no banner. Admins get an Edit button.
 */
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Icon } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, radius, spacing } from '@/design/tokens';
import { fileUrl } from '@/features/session/customer';
import { useActiveMembership } from '@/stores/session';

export function TeamBanner({ editable = false }: { editable?: boolean }) {
  const { t } = useTranslation();
  const m = useActiveMembership();
  const url = fileUrl(m?.look?.bannerUrl);
  if (!url) return null;
  return (
    <View style={s.wrap}>
      <Image source={{ uri: url }} style={s.img} resizeMode="cover" accessibilityLabel={t('banner.a11y', { name: m?.look?.appName || m?.partyName || '' })} />
      {editable ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('banner.edit')} onPress={() => router.push('/admin/banner')} style={({ pressed }) => [s.edit, pressed && s.pressed]}>
          <Icon name="pencil" size={14} color={colors.accent} />
          <AppText variant="footnote" weight="semibold" color={colors.accent}>{t('banner.editShort')}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  wrap: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: radius.lg, overflow: 'hidden', aspectRatio: 2, maxWidth: '100%', backgroundColor: colors.fill },
  img: { width: '100%', height: '100%' },
  edit: { position: 'absolute', right: spacing.sm, bottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, paddingHorizontal: spacing.md, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.94)' },
  pressed: { opacity: 0.7 },
}));
