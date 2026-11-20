/**
 * Sign-in on the website (spec accounts-access AC1, AC2, AC13): Google pop-up (redirect when pop-ups are blocked)
 * and email + password, through the Firebase JS SDK. The app then trades the Firebase ID token for its own session.
 * Active only when the build sets EXPO_PUBLIC_AUTH_MODE=firebase. The Firebase web config is public by design.
 */
import type { Auth, User } from 'firebase/auth';

export const firebaseOn = () => process.env.EXPO_PUBLIC_AUTH_MODE === 'firebase';

const cfg = () => ({
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
});

async function fb(): Promise<{ a: typeof import('firebase/auth'); auth: Auth }> {
  const [{ getApps, initializeApp }, a] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
  const app = getApps()[0] ?? initializeApp(cfg());
  const auth = a.getAuth(app);
  await auth.authStateReady();
  return { a, auth };
}

const err = (code: string) => Object.assign(new Error(code), { code });

/** Google. Returns the ID token, or never resolves when the page goes to Google (redirect fallback). */
export async function googleSignIn(lang = 'en'): Promise<string> {
  const { a, auth } = await fb();
  auth.languageCode = lang;
  const p = new a.GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  try {
    const c = await a.signInWithPopup(auth, p);
    return c.user.getIdToken();
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await a.signInWithRedirect(auth, p);
      return new Promise<string>(() => undefined);
    }
    throw e;
  }
}

/** After a redirect sign-in, the token when the page comes back from Google. */
export async function redirectToken(): Promise<string | null> {
  if (!firebaseOn()) return null;
  const { a, auth } = await fb();
  const r = await a.getRedirectResult(auth).catch(() => null);
  return r?.user ? r.user.getIdToken() : null;
}

/** Email + password. `unverified` = the account exists but the email link was not opened yet. */
export async function emailSignIn(email: string, password: string): Promise<{ token?: string; unverified?: boolean }> {
  const { a, auth } = await fb();
  const c = await a.signInWithEmailAndPassword(auth, email.trim(), password);
  if (!c.user.emailVerified) return { unverified: true };
  return { token: await c.user.getIdToken(true) };
}

export async function emailCreate(email: string, password: string, lang = 'en') {
  const { a, auth } = await fb();
  auth.languageCode = lang;
  const c = await a.createUserWithEmailAndPassword(auth, email.trim(), password);
  await a.sendEmailVerification(c.user);
}

export async function resendVerification() {
  const { a, auth } = await fb();
  if (!auth.currentUser) throw err('auth/no-current-user');
  await a.sendEmailVerification(auth.currentUser);
}

/** After the person opened the email link: the token, or null while still not verified. */
export async function verifiedToken(): Promise<string | null> {
  const { auth } = await fb();
  const u = auth.currentUser;
  if (!u) throw err('auth/no-current-user');
  await u.reload();
  return u.emailVerified ? u.getIdToken(true) : null;
}

export async function resetPassword(email: string, lang = 'en') {
  const { a, auth } = await fb();
  auth.languageCode = lang;
  await a.sendPasswordResetEmail(auth, email.trim());
}

export async function signOutFirebase() {
  if (!firebaseOn()) return;
  const { a, auth } = await fb();
  await a.signOut(auth).catch(() => undefined);
}

/** How the person signed in on this device (for account deletion: Google again, or the password). */
export async function signInMethod(): Promise<'google' | 'password' | null> {
  if (!firebaseOn()) return null;
  const { auth } = await fb();
  const p = auth.currentUser?.providerData[0]?.providerId;
  return p === 'google.com' ? 'google' : p === 'password' ? 'password' : null;
}

/** AC13: sign in again (fresh token) before deleting the account. */
export async function freshToken(password?: string): Promise<string> {
  const { a, auth } = await fb();
  const u: User | null = auth.currentUser;
  if (password) {
    if (!u?.email) throw err('auth/no-current-user');
    const c = await a.reauthenticateWithCredential(u, a.EmailAuthProvider.credential(u.email, password));
    return c.user.getIdToken(true);
  }
  const p = new a.GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  const c = u ? await a.reauthenticateWithPopup(u, p) : await a.signInWithPopup(auth, p);
  return c.user.getIdToken(true);
}
