import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Button, Icon, LargeTitle } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, radius, spacing } from '@/design/tokens';
import { logout } from '@/features/session/session';
import { AuthScreen } from '@/features/shell/AuthScreen';

/** Choose role (spec accounts-access AC5): Volunteer (team code) or Admin (request to the super-admin). */
export default function Register() {
  const { t } = useTranslation();
  const Choice = ({ icon, title, body, to }: { icon: 'people' | 'briefcase'; title: string; body: string; to: string }) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${body}`} onPress={() => router.replace(to as never)} style={({ pressed }) => [s.card, pressed && s.pressed]}>
      <View style={s.iconBox}><Icon name={icon} size={28} color={colors.accent} /></View>
      <View style={s.text}>
        <AppText variant="headline">{title}</AppText>
        <AppText variant="callout" color={colors.textSecondary}>{body}</AppText>
      </View>
      <Icon name="chevron-forward" size={20} color={colors.textTertiary} />
    </Pressable>
  );
  return (
    <AuthScreen>
      <LargeTitle title={t('register.title')} subtitle={t('register.subtitle')} />
      <View style={s.body}>
        <Choice icon="people" title={t('register.volunteer')} body={t('register.volunteerBody')} to="/join" />
        <Choice icon="briefcase" title={t('register.admin')} body={t('register.adminBody')} to="/register-admin" />
        <Button kind="plain" label={t('auth.logout')} onPress={() => void logout()} />
      </View>
    </AuthScreen>
  );
}

const s = themed(() => StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.lg, marginTop: spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.separator, minHeight: 88 },
  pressed: { opacity: 0.7 },
  iconBox: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 4 },
}));
