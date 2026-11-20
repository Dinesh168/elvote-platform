/**
 * Sign-in on phones (spec accounts-access AC1, AC2, AC13; live-demo D10).
 * - APK / store builds: native Google account picker (@react-native-google-signin) + native Firebase
 *   (@react-native-firebase/auth) for Google and email + password.
 * - Expo Go (iPhone testing): Expo Go cannot load those native modules, so email + password runs on the Firebase
 *   JS SDK (kept signed in with AsyncStorage) and the Google button is hidden.
 * Loaded only in builds with EXPO_PUBLIC_AUTH_MODE=firebase; local builds never touch these modules.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { Auth } from 'firebase/auth';

export const firebaseOn = () => process.env.EXPO_PUBLIC_AUTH_MODE === 'firebase';
const inExpoGo = () => Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Google sign-in needs the native module, which Expo Go does not have. */
export const googleAvailable = () => !inExpoGo();

const err = (code: string) => Object.assign(new Error(code), { code });

/* eslint-disable @typescript-eslint/no-require-imports */
const fa = () => require('@react-native-firebase/auth') as typeof import('@react-native-firebase/auth');
const gs = () => require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
/* eslint-enable @typescript-eslint/no-require-imports */

// ---------- Expo Go: Firebase JS SDK ----------
let jsAuth: Promise<{ a: typeof import('firebase/auth'); auth: Auth }> | null = null;
function js() {
  jsAuth ??= (async () => {
    const [{ getApps, initializeApp }, a] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
    const app = getApps()[0] ?? initializeApp({
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    });
    // The React Native build of firebase/auth exports getReactNativePersistence (not in the web typings).
    const persistence = (a as unknown as { getReactNativePersistence: (s: typeof AsyncStorage) => import('firebase/auth').Persistence }).getReactNativePersistence(AsyncStorage);
    let auth: Auth;
    try {
      auth = a.initializeAuth(app, { persistence });
    } catch {
      auth = a.getAuth(app);
    }
    await auth.authStateReady();
    return { a, auth };
  })();
  return jsAuth;
}

// ---------- APK: native Google ----------
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
  if (inExpoGo()) throw err('auth/operation-not-supported-in-this-environment');
  const m = fa();
  const c = await m.signInWithCredential(m.getAuth(), m.GoogleAuthProvider.credential(await googleIdToken()));
  return c.user.getIdToken();
}

export async function redirectToken(): Promise<string | null> {
  return null;
}

export async function emailSignIn(email: string, password: string): Promise<{ token?: string; unverified?: boolean }> {
  if (inExpoGo()) {
    const { a, auth } = await js();
    const c = await a.signInWithEmailAndPassword(auth, email.trim(), password);
    if (!c.user.emailVerified) return { unverified: true };
    return { token: await c.user.getIdToken(true) };
  }
  const m = fa();
  const c = await m.signInWithEmailAndPassword(m.getAuth(), email.trim(), password);
  if (!c.user.emailVerified) return { unverified: true };
  return { token: await c.user.getIdToken(true) };
}

export async function emailCreate(email: string, password: string) {
  if (inExpoGo()) {
    const { a, auth } = await js();
    const c = await a.createUserWithEmailAndPassword(auth, email.trim(), password);
    await a.sendEmailVerification(c.user);
    return;
  }
  const m = fa();
  const c = await m.createUserWithEmailAndPassword(m.getAuth(), email.trim(), password);
  await m.sendEmailVerification(c.user);
}

export async function resendVerification() {
  if (inExpoGo()) {
    const { a, auth } = await js();
    if (!auth.currentUser) throw err('auth/no-current-user');
    await a.sendEmailVerification(auth.currentUser);
    return;
  }
  const m = fa();
  const u = m.getAuth().currentUser;
  if (!u) throw err('auth/no-current-user');
  await m.sendEmailVerification(u);
}

export async function verifiedToken(): Promise<string | null> {
  if (inExpoGo()) {
    const { auth } = await js();
    const u = auth.currentUser;
    if (!u) throw err('auth/no-current-user');
    await u.reload();
    return u.emailVerified ? u.getIdToken(true) : null;
  }
  const m = fa();
  const u = m.getAuth().currentUser;
  if (!u) throw err('auth/no-current-user');
  await u.reload();
  const fresh = m.getAuth().currentUser;
  return fresh?.emailVerified ? fresh.getIdToken(true) : null;
}

export async function resetPassword(email: string) {
  if (inExpoGo()) {
    const { a, auth } = await js();
    await a.sendPasswordResetEmail(auth, email.trim());
    return;
  }
  const m = fa();
  await m.sendPasswordResetEmail(m.getAuth(), email.trim());
}

export async function signOutFirebase() {
  if (!firebaseOn()) return;
  if (inExpoGo()) {
    const { a, auth } = await js();
    await a.signOut(auth).catch(() => undefined);
    return;
  }
  const m = fa();
  await m.signOut(m.getAuth()).catch(() => undefined);
  await google().GoogleSignin.signOut().catch(() => undefined);
}

export async function signInMethod(): Promise<'google' | 'password' | null> {
  if (!firebaseOn()) return null;
  const p = inExpoGo() ? (await js()).auth.currentUser?.providerData[0]?.providerId : fa().getAuth().currentUser?.providerData[0]?.providerId;
  return p === 'google.com' ? 'google' : p === 'password' ? 'password' : null;
}

export async function freshToken(password?: string): Promise<string> {
  if (inExpoGo()) {
    const { a, auth } = await js();
    const u = auth.currentUser;
    if (!u?.email || !password) throw err('auth/no-current-user');
    const c = await a.reauthenticateWithCredential(u, a.EmailAuthProvider.credential(u.email, password));
    return c.user.getIdToken(true);
  }
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
