/**
 * Sign-in flow helpers: load /me, decide where the user lands, switch role, log out.
 * The server decides access; this only picks which screens to show.
 */
import { router } from 'expo-router';
import { authApi } from '@/api/adminApi';
import { signOutFirebase } from '@/features/auth/firebaseAuth';
import { ApiError } from '@/api/http';
import { clearDeviceCache, queryClient } from '@/features/data';
import { unregisterPush } from '@/features/pollingDay/push';
import { stopTracking, usePresence } from '@/features/pollingDay/tracker';
import { requestSync } from '@/features/sync/engine';
import { i18n, initI18n , isLang } from '@/i18n';
import { useNotice } from '@/stores/notice';
import { useOutbox } from '@/stores/outbox';
import { usePrefs } from '@/stores/prefs';
import { applyBrand } from '@/design/theme';
import { useSession, type MeInfo, type Mode } from '@/stores/session';


export type Target = { mode: Mode; membershipId: string | null; path: string };

export function homeOf(mode: Mode) {
  return mode === 'platform' ? '/platform' : mode === 'admin' ? '/admin/dashboard' : '/home';
}

/** All roles this user can open, best first: super-admin, admin ACs, volunteer ACs. */
export function rolesOf(me: MeInfo): Target[] {
  const out: Target[] = [];
  if (me.isSuperAdmin) out.push({ mode: 'platform', membershipId: null, path: '/platform' });
  for (const m of me.memberships) {
    if (m.status !== 'approved') continue;
    out.push({ mode: m.role === 'admin' ? 'admin' : 'volunteer', membershipId: m.id, path: homeOf(m.role === 'admin' ? 'admin' : 'volunteer') });
  }
  return out;
}

/**
 * Where to go after sign-in (spec accounts-access): Your details first; then the last used role if still valid,
 * else the best role; else waiting (volunteer or admin request); else choose Admin / Volunteer.
 */
export function landing(me: MeInfo): string | Target {
  const profileDone = me.user.profileDone ?? (!!me.user.mobile && !!me.user.name?.trim());
  if (!profileDone) return '/profile';
  const { mode, membershipId } = useSession.getState();
  const roles = rolesOf(me);
  const keep = roles.find((r) => r.mode === mode && r.membershipId === membershipId);
  if (keep) return keep;
  // Prefer a team whose subscription is active (a whole-state admin may also cover a paused assembly).
  const active = roles.find((r) => r.mode === 'platform' || me.memberships.find((m) => m.id === r.membershipId)?.active !== false);
  if (active) return active;
  if (roles.length) return roles[0];
  if (me.memberships.some((m) => m.status === 'pending' || m.status === 'rejected')) return '/waiting';
  if (me.accessRequest && (me.accessRequest.status === 'pending' || me.accessRequest.status === 'rejected')) return '/waiting';
  return '/register';
}

export async function loadMe(): Promise<MeInfo> {
  try {
    const me = await authApi.me();
    useSession.getState().setMe(me);
    return me;
  } catch (e) {
    // No internet: open with the profile kept on the device (spec sync-modes S1).
    const cached = useSession.getState().me;
    if (e instanceof ApiError && e.code === 'network' && cached) return cached;
    throw e;
  }
}

/** Unsent changes on this device (spec sync-modes S7). */
export const unsentCount = () => useOutbox.getState().items.length;

/** Tries to send unsent changes; true when nothing is left. Shows a notice when something is still waiting. */
export async function ensureSynced(): Promise<boolean> {
  if (!unsentCount()) return true;
  await requestSync('manual');
  const n = unsentCount();
  if (n) useNotice.getState().show(i18n.t('sync.unsentBlock', { count: n }));
  return n === 0;
}

export async function activate(t: Target) {
  const s = useSession.getState();
  if (s.mode !== t.mode || s.membershipId !== t.membershipId) queryClient.clear();
  await s.activate(t.mode, t.membershipId);
  const mem = s.me?.memberships.find((x) => x.id === t.membershipId);
  // Customer look (spec customer-cms C1/C4): party colour for the whole app, default language unless the person chose one.
  applyBrand(t.mode === 'platform' ? null : mem?.look?.colour ?? null);
  const def = mem?.look?.defaultLang;
  const prefs0 = usePrefs.getState();
  if (t.mode !== 'platform' && isLang(def) && !prefs0.langChosen && prefs0.lang !== def) {
    prefs0.applyDefaultLang(def);
    await initI18n(def);
  }
  if (t.mode === 'volunteer') {
    const m = s.me?.memberships.find((x) => x.id === t.membershipId);
    const prefs = usePrefs.getState();
    if (m && m.booths.length && !m.booths.includes(prefs.booth)) prefs.setBooth(m.booths[0]);
  }
}

const AREA: Record<Mode, RegExp> = {
  platform: /^\/platform(\/|\?|$)/,
  admin: /^\/admin(\/|\?|$)/,
  volunteer: /^\/(home|voters|poll|me|stats|tasks|surnames|slip|help)(\/|\?|$)/,
};

/** Signs in to the right role. `next` (a page reloaded on web) is kept when it belongs to that role. */
export async function goLanding(next?: string) {
  const me = await loadMe();
  const to = landing(me);
  if (typeof to === 'string') router.replace(to as never);
  else {
    await activate(to);
    const mem = me.memberships.find((x) => x.id === to.membershipId);
    if (mem && mem.active === false) return router.replace('/paused');
    router.replace((next && AREA[to.mode].test(next) ? next : to.path) as never);
  }
}

export async function logout() {
  // S7: never throw away unsent changes. Send them first; if that fails, stay signed in.
  if (!(await ensureSynced())) return;
  // Polling day: stop location, forget it, and stop this phone's alerts (spec polling-day O1).
  await stopTracking().catch(() => undefined);
  usePresence.setState({ mid: null, day: null, booths: [], local: null, queue: [], server: null, permission: null });
  await unregisterPush();
  const rt = useSession.getState().refreshToken;
  if (rt) await authApi.logout(rt).catch(() => undefined);
  await signOutFirebase().catch(() => undefined); // the next person on this device signs in with their own account
  queryClient.clear();
  await clearDeviceCache();
  await useSession.getState().signOut();
  applyBrand(null);
  router.replace('/login');
}
