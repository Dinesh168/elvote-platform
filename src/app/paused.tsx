import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Button, Icon, LargeTitle } from '@/design/components';
import { colors, spacing } from '@/design/tokens';
import { goLanding, logout, rolesOf } from '@/features/session/session';
import { AuthScreen } from '@/features/shell/AuthScreen';
import { useActiveMembership, useSession } from '@/stores/session';

/** C5: this team's subscription is paused, closed or past its end date (set by the super-admin). */
export default function Paused() {
  const { t } = useTranslation();
  const me = useSession((s) => s.me);
  const m = useActiveMembership();
  const [busy, setBusy] = useState(false);
  const { who } = useLocalSearchParams<{ who?: string }>();
  const roles = me ? rolesOf(me) : [];
  return (
    <AuthScreen>
      <LargeTitle title={t('paused.title')} subtitle={m ? `${m.partyName} · ${t('admin.acTitle', { no: m.acNo, name: m.acName })}` : undefined} />
      <View style={s.body}>
        <View style={s.icon}><Icon name="pause-circle" size={64} color={colors.warning} /></View>
        <AppText variant="body" align="center">{who === 'me' ? t('easy.pausedMe') : t('paused.body')}</AppText>
        <Button block label={t('paused.check')} disabled={busy} onPress={() => { setBusy(true); void goLanding().finally(() => setBusy(false)); }} />
        {roles.length > 1 ? <Button block kind="tinted" label={t('me2.switchRole')} onPress={() => router.push('/choose')} /> : null}
        <Button kind="plain" label={t('auth.logout')} onPress={() => void logout()} />
      </View>
    </AuthScreen>
  );
}

const s = StyleSheet.create({
  body: { padding: spacing.xxl, gap: spacing.lg },
  icon: { alignItems: 'center', paddingVertical: spacing.xl },
});
