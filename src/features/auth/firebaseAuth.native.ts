/**
 * Sign-in on Android (spec accounts-access AC1, AC2, AC13): the native Google account picker
 * (@react-native-google-signin) and email + password, through native Firebase (@react-native-firebase/auth).
 * Loaded only in builds with EXPO_PUBLIC_AUTH_MODE=firebase (the demo/production APK); Expo Go and local builds
 * never touch the native modules.
 */
export const firebaseOn = () => process.env.EXPO_PUBLIC_AUTH_MODE === 'firebase';

/* eslint-disable @typescript-eslint/no-require-imports */
const fa = () => require('@react-native-firebase/auth') as typeof import('@react-native-firebase/auth');
const gs = () => require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
/* eslint-enable @typescript-eslint/no-require-imports */

const err = (code: string) => Object.assign(new Error(code), { code });

let configured = false;
function google() {
  const g = gs();
  if (!configured) {
    g.GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID });
    configured = true;
  }
  return g;
}

async function googleIdToken(): Promise<string> {
  const g = google();
  await g.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const r = await g.GoogleSignin.signIn();
  if (r.type !== 'success' || !r.data.idToken) throw err('auth/popup-closed-by-user');
  return r.data.idToken;
}

export async function googleSignIn(): Promise<string> {
  const m = fa();
  const cred = m.GoogleAuthProvider.credential(await googleIdToken());
  const c = await m.signInWithCredential(m.getAuth(), cred);
  return c.user.getIdToken();
}

export async function redirectToken(): Promise<string | null> {
  return null;
}

export async function emailSignIn(email: string, password: string): Promise<{ token?: string; unverified?: boolean }> {
  const m = fa();
  const c = await m.signInWithEmailAndPassword(m.getAuth(), email.trim(), password);
  if (!c.user.emailVerified) return { unverified: true };
  return { token: await c.user.getIdToken(true) };
}

export async function emailCreate(email: string, password: string) {
  const m = fa();
  const c = await m.createUserWithEmailAndPassword(m.getAuth(), email.trim(), password);
  await m.sendEmailVerification(c.user);
}

export async function resendVerification() {
  const m = fa();
  const u = m.getAuth().currentUser;
  if (!u) throw err('auth/no-current-user');
  await m.sendEmailVerification(u);
}

export async function verifiedToken(): Promise<string | null> {
  const m = fa();
  const u = m.getAuth().currentUser;
  if (!u) throw err('auth/no-current-user');
  await u.reload();
  const fresh = m.getAuth().currentUser;
  return fresh?.emailVerified ? fresh.getIdToken(true) : null;
}

export async function resetPassword(email: string) {
  const m = fa();
  await m.sendPasswordResetEmail(m.getAuth(), email.trim());
}

export async function signOutFirebase() {
  if (!firebaseOn()) return;
  const m = fa();
  await m.signOut(m.getAuth()).catch(() => undefined);
  await google().GoogleSignin.signOut().catch(() => undefined);
}

export async function signInMethod(): Promise<'google' | 'password' | null> {
  if (!firebaseOn()) return null;
  const p = fa().getAuth().currentUser?.providerData[0]?.providerId;
  return p === 'google.com' ? 'google' : p === 'password' ? 'password' : null;
}

export async function freshToken(password?: string): Promise<string> {
  const m = fa();
  const u = m.getAuth().currentUser;
  if (password) {
    if (!u?.email) throw err('auth/no-current-user');
    const c = await m.reauthenticateWithCredential(u, m.EmailAuthProvider.credential(u.email, password));
    return c.user.getIdToken(true);
  }
  const cred = m.GoogleAuthProvider.credential(await googleIdToken());
  const c = u ? await m.reauthenticateWithCredential(u, cred) : await m.signInWithCredential(m.getAuth(), cred);
  return c.user.getIdToken(true);
}
