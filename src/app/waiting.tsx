import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Button, Icon, LargeTitle } from '@/design/components';
import { AuthScreen } from '@/features/shell/AuthScreen';
import { colors, spacing } from '@/design/tokens';
import { goLanding, logout } from '@/features/session/session';
import { useSession } from '@/stores/session';

/** V1 waiting: request sent, admin has not approved yet (or rejected it). */
export default function Waiting() {
  const { t } = useTranslation();
  const me = useSession((s) => s.me);
  const [busy, setBusy] = useState(false);
  const rejected = me?.memberships.find((m) => m.status === 'rejected');
  const pending = me?.memberships.find((m) => m.status === 'pending');
  return (
    <AuthScreen>
      <LargeTitle title={t('auth.waitingTitle')} subtitle={pending ? `${pending.partyName} · ${t('admin.acTitle', { no: pending.acNo, name: pending.acName })}` : undefined} />
      <View style={s.body}>
        <View style={s.icon}>
          <Icon name={rejected && !pending ? 'close-circle' : 'time'} size={64} color={rejected && !pending ? colors.danger : colors.accent} />
        </View>
        <AppText variant="body" align="center">{rejected && !pending ? t('auth.rejected') : t('auth.waitingBody')}</AppText>
        <Button block label={t('auth.refresh')} disabled={busy} onPress={() => { setBusy(true); void goLanding().finally(() => setBusy(false)); }} />
        {rejected && !pending ? <Button block kind="tinted" label={t('auth.joinAgain')} onPress={() => router.replace('/join')} /> : null}
        <Button kind="plain" label={t('auth.logout')} onPress={() => void logout()} />
      </View>
    </AuthScreen>
  );
}

const s = StyleSheet.create({
  body: { padding: spacing.xxl, gap: spacing.lg },
  icon: { alignItems: 'center', paddingVertical: spacing.xl },
});
