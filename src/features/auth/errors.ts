/** Firebase sign-in errors → plain-language messages (spec accounts-access AC2). Same codes on web and Android. */
const code = (e: unknown) => String((e as { code?: string } | null)?.code ?? '');

/** The person closed the Google window or picker: not an error, show nothing. */
export const isCancelled = (e: unknown) =>
  /popup-closed-by-user|cancelled-popup-request|user-cancelled|SIGN_IN_CANCELLED|^12501$|^-5$/.test(code(e));

export function authMessage(e: unknown, t: (k: string) => string): string {
  switch (code(e)) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return t('auth.wrongPassword');
    case 'auth/user-not-found':
      return t('auth.noAccount');
    case 'auth/email-already-in-use':
      return t('auth.emailInUse');
    case 'auth/weak-password':
      return t('auth.weakPassword');
    case 'auth/invalid-email':
    case 'auth/missing-email':
      return t('auth.badEmail');
    case 'auth/too-many-requests':
      return t('auth.tooMany');
    case 'auth/network-request-failed':
      return t('auth.noInternet');
    case 'auth/account-exists-with-different-credential':
      return t('auth.otherMethod');
    case 'auth/popup-blocked':
      return t('auth.popupBlocked');
    default:
      return t('auth.signInFailed');
  }
}
