/**
 * Sign out with a pop-up (spec usability-r2 U1). With unsent changes the pop-up says how many and offers
 * "Send and sign out"; if they cannot be sent (no internet) the person stays signed in (sync S7: never lose work).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/design/components/ConfirmDialog';
import { useOutbox } from '@/stores/outbox';
import { logout } from './session';

export function useSignOut() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const unsent = useOutbox((s) => s.items.length + s.problems.length);
  const close = () => setOpen(false);
  const go = () => {
    setOpen(false);
    void logout();
  };
  const dialog = (
    <ConfirmDialog
      visible={open}
      onDismiss={close}
      title={t('signout.title')}
      message={unsent ? t('signout.unsent', { count: unsent }) : t('signout.body')}
      actions={[
        { label: t('common.cancel'), style: 'cancel', onPress: close, testID: 'signout-cancel' },
        { label: unsent ? t('signout.sendAndSignOut') : t('auth.logout'), style: 'destructive', onPress: go, testID: 'signout-confirm' },
      ]}
    />
  );
  return { ask: () => setOpen(true), dialog };
}
