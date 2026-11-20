import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/api/adminApi';
import { AppText, Button, Icon, LargeTitle } from '@/design/components';
import { AuthScreen } from '@/features/shell/AuthScreen';
import { colors, spacing } from '@/design/tokens';
import { PushPrompt } from '@/features/pollingDay/PushPrompt';
import { goLanding, landing, loadMe, logout } from '@/features/session/session';
import { useSession } from '@/stores/session';

const CHECK_MS = 30_000;

/**
 * Waiting (spec accounts-access AC6, AC10, AC11): a volunteer's join request or an admin request is with the approver.
 * Checks every 30 s and moves into the app as soon as it is approved; asks to allow notifications.
 */
export default function Waiting() {
  const { t } = useTranslation();
  const me = useSession((s) => s.me);
  const [busy, setBusy] = useState(false);
  const req = me?.accessRequest;
  const rejected = me?.memberships.find((m) => m.status === 'rejected');
  const pending = me?.memberships.find((m) => m.status === 'pending');
  const adminPending = req?.status === 'pending';
  const adminRejected = req?.status === 'rejected' && !pending && !adminPending;
  const volunteerRejected = !!rejected && !pending && !adminPending;
  const isRejected = adminRejected || volunteerRejected;

  // Approved while waiting → straight into the app.
  useEffect(() => {
    const id = setInterval(() => {
      void loadMe().then((m) => {
        if (typeof landing(m) !== 'string') void goLanding();
      }).catch(() => undefined);
    }, CHECK_MS);
    return () => clearInterval(id);
  }, []);

  const area = req ? (req.wholeState ? t('waiting.wholeState', { state: req.stateCode }) : t('waiting.acs', { state: req.stateCode, acs: req.acNos.join(', ') })) : '';
  const subtitle = adminPending || adminRejected
    ? `${req!.partyName} · ${area}`
    : pending ? `${pending.partyName} · ${t('admin.acTitle', { no: pending.acNo, name: pending.acName })}` : undefined;

  return (
    <AuthScreen>
      <LargeTitle title={isRejected ? t('waiting.notApproved') : adminPending ? t('waiting.adminTitle') : t('auth.waitingTitle')} subtitle={subtitle} />
      <View style={s.body}>
        <View style={s.icon}>
          <Icon name={isRejected ? 'close-circle' : 'time'} size={64} color={isRejected ? colors.danger : colors.accent} />
        </View>
        <AppText variant="body" align="center">
          {adminRejected ? t('waiting.reason', { reason: req!.reason ?? '' })
            : volunteerRejected ? t('auth.rejected')
            : adminPending ? t('waiting.adminBody') : t('auth.waitingBody')}
        </AppText>
        {!isRejected ? <PushPrompt reason="approval" /> : null}
        <Button block label={t('auth.refresh')} disabled={busy} onPress={() => { setBusy(true); void goLanding().finally(() => setBusy(false)); }} />
        {adminPending ? (
          <Button block kind="tinted" label={t('waiting.withdraw')} disabled={busy} onPress={() => {
            setBusy(true);
            void authApi.withdrawRequest(req!.id).then(() => goLanding()).finally(() => setBusy(false));
          }} />
        ) : null}
        {volunteerRejected ? <Button block kind="tinted" label={t('auth.joinAgain')} onPress={() => router.replace('/join')} /> : null}
        {adminRejected ? <Button block kind="tinted" label={t('waiting.tryAgain')} onPress={() => router.replace('/register')} /> : null}
        <Button kind="plain" label={t('auth.logout')} onPress={() => void logout()} />
      </View>
    </AuthScreen>
  );
}

const s = StyleSheet.create({
  body: { padding: spacing.xxl, gap: spacing.lg },
  icon: { alignItems: 'center', paddingVertical: spacing.xl },
});
