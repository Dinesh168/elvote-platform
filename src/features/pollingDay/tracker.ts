/**
 * Polling-day location (spec docs/specs/polling-day.md V1–V4). Runs only inside the polling-day window.
 * - Phones: background location task (Android shows a notification while it runs); foreground watch if only "while using" is allowed.
 * - Web: watchPosition while the page is open.
 * The at-booth check runs here first (works with no signal) and the readings that change something are queued
 * and sent when online; the server repeats the check and alerts the admins.
 */
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { API_MODE } from '@/api/client';
import { ApiError, http } from '@/api/http';
import { i18n } from '@/i18n';
import { durable } from '@/lib/durable';
import { useSession } from '@/stores/session';
import { ensureChannel, requestNotifyPermission, showLocal } from './notify';
import { inWindow, judge, type BoothPoint, type Local, type PollingDay } from './rules';

export const TASK = 'elvote-polling-day-location';
export type Permission = 'granted' | 'foreground' | 'denied' | 'off';
export type ServerStatus = 'checking' | 'at_booth' | 'away' | 'location_off' | 'no_booth_location';
interface Report { mid: string; permission: Permission; lat?: number; lng?: number; accuracy?: number; at: string; local: string }

const SEND_EVERY_MS = 60_000; // at most one routine report a minute (changes go at once)
const WARN_AGAIN_MS = 15 * 60_000; // V3
const MAX_QUEUE = 20;

interface PresenceState {
  mid: string | null;
  day: PollingDay | null;
  booths: BoothPoint[];
  local: Local | null;
  permission: Permission | null;
  queue: Report[];
  lastSentAt: number | null;
  lastWarnAt: number | null;
  server: { status: ServerStatus | null; distanceM: number | null; partNo: number | null } | null;
}
const EMPTY: PresenceState = { mid: null, day: null, booths: [], local: null, permission: null, queue: [], lastSentAt: null, lastWarnAt: null, server: null };

export const usePresence = create<PresenceState>()(
  persist(() => EMPTY, { name: 'elvote.presence.v1', storage: createJSONStorage(() => durable), version: 1 }),
);

/** A background task can start with the app closed: load the saved state and the sign-in first. */
async function ready() {
  if (!usePresence.persist.hasHydrated()) await usePresence.persist.rehydrate();
  if (!useSession.getState().loaded) await useSession.getState().load();
}

/** Sets what the check uses (team, polling day, booth points). A new polling day starts fresh. */
export function configure(mid: string, day: PollingDay, booths: BoothPoint[]) {
  const s = usePresence.getState();
  const fresh = s.mid !== mid || s.day?.electionId !== day.electionId || s.day?.date !== day.date;
  usePresence.setState(fresh ? { ...EMPTY, mid, day, booths } : { mid, day, booths });
}

// ---------- permission ----------

export interface PermissionInfo { permission: Permission | 'undetermined'; canAskAgain: boolean }

export async function checkPermission(): Promise<PermissionInfo> {
  try {
    if (Platform.OS !== 'web' && !(await Location.hasServicesEnabledAsync())) return { permission: 'off', canAskAgain: true };
    const fg = await Location.getForegroundPermissionsAsync();
    if (fg.status !== 'granted') return { permission: fg.status === 'denied' ? 'denied' : 'undetermined', canAskAgain: fg.canAskAgain };
    if (Platform.OS === 'web') return { permission: 'granted', canAskAgain: true };
    const bg = await Location.getBackgroundPermissionsAsync();
    return { permission: bg.status === 'granted' ? 'granted' : 'foreground', canAskAgain: bg.canAskAgain };
  } catch {
    return { permission: 'denied', canAskAgain: false };
  }
}

/** V1: ask for location (then "all the time" on phones) and for notifications (the away warning). */
export async function askPermission(): Promise<PermissionInfo> {
  try {
    if (Platform.OS === 'web') {
      // The browser asks when the position is first read.
      await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return checkPermission();
    }
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status === 'granted') {
      await Location.requestBackgroundPermissionsAsync().catch(() => undefined);
      await requestNotifyPermission();
    }
  } catch {
    // denied in the browser, or services off
  }
  return checkPermission();
}

// ---------- tracking ----------

let watch: Location.LocationSubscription | null = null;

export async function startTracking(permission: Permission) {
  if (permission !== 'granted' && permission !== 'foreground') return;
  usePresence.setState({ permission });
  if (Platform.OS !== 'web' && permission === 'granted') {
    if (watch) { watch.remove(); watch = null; }
    if (!(await Location.hasStartedLocationUpdatesAsync(TASK).catch(() => false))) {
      await ensureChannel();
      await Location.startLocationUpdatesAsync(TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 120_000,
        distanceInterval: 50,
        deferredUpdatesInterval: 120_000,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        activityType: Location.ActivityType.Other,
        foregroundService: {
          notificationTitle: i18n.t('pd.fgTitle'),
          notificationBody: i18n.t('pd.fgBody'),
          killServiceOnDestroy: false,
        },
      });
    }
  } else if (!watch) {
    watch = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 120_000, distanceInterval: 50 },
      (loc) => void onLocations([loc]),
    );
  }
  // First reading straight away (do not wait 2 minutes).
  Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then((loc) => onLocations([loc]), () => undefined);
}

export async function stopTracking() {
  if (watch) { watch.remove(); watch = null; }
  if (Platform.OS !== 'web' && (await Location.hasStartedLocationUpdatesAsync(TASK).catch(() => false))) {
    await Location.stopLocationUpdatesAsync(TASK).catch(() => undefined);
  }
}

/** Every new position (foreground watch or the background task). */
export async function onLocations(locs: Location.LocationObject[]) {
  await ready();
  const s = usePresence.getState();
  if (!s.mid || !s.day) return;
  if (!inWindow(s.day)) { await stopTracking(); return; }
  for (const loc of [...locs].sort((a, b) => a.timestamp - b.timestamp)) {
    const cur = usePresence.getState();
    const local = judge(cur.local, { lat: loc.coords.latitude, lng: loc.coords.longitude, accuracy: loc.coords.accuracy, at: loc.timestamp }, cur.booths, cur.day!.radiusM);
    usePresence.setState({ local });
    if (local.status === 'away' && (local.event === 'left' || !cur.lastWarnAt || Date.now() - cur.lastWarnAt >= WARN_AGAIN_MS)) await warn(local);
    if (local.event === 'returned') usePresence.setState({ lastWarnAt: null });
    enqueue({
      mid: cur.mid!, permission: cur.permission ?? 'granted', lat: loc.coords.latitude, lng: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? undefined, at: new Date(loc.timestamp).toISOString(), local: local.status,
    });
  }
  await flush();
}

/** V1/A1: tell the server that location is off or not allowed (the admin sees "Location off"). */
export async function reportPermission(mid: string, permission: Permission) {
  await ready();
  const prev = usePresence.getState().permission;
  usePresence.setState({ permission });
  if (prev === permission && (permission === 'denied' || permission === 'off')) return;
  enqueue({ mid, permission, at: new Date().toISOString(), local: permission });
  await flush(true);
}

/** Keeps readings where something changed, plus the latest (V4: the server can replay left/returned in order). */
function enqueue(r: Report) {
  const q = usePresence.getState().queue;
  const last = q[q.length - 1];
  const next = last && last.local === r.local && last.permission === r.permission && last.mid === r.mid ? [...q.slice(0, -1), r] : [...q, r];
  usePresence.setState({ queue: next.slice(-MAX_QUEUE) });
}

let sending = false;
/** Sends queued readings in order; stops at the first network error and keeps the rest. */
export async function flush(force = false) {
  const s = usePresence.getState();
  if (sending || !s.queue.length || API_MODE !== 'http') return;
  const changed = s.queue.length > 1 || s.queue[0].local !== s.server?.status;
  if (!force && !changed && s.lastSentAt && Date.now() - s.lastSentAt < SEND_EVERY_MS) return;
  sending = true;
  try {
    while (usePresence.getState().queue.length) {
      const r = usePresence.getState().queue[0];
      try {
        const { mid, local: _local, ...body } = r;
        const out = await http.post<{ stored: boolean; status: ServerStatus | null; distanceM: number | null; partNo: number | null }>(`/v1/m/${mid}/presence`, body);
        usePresence.setState({ server: out.stored ? { status: out.status, distanceM: out.distanceM, partNo: out.partNo } : null });
      } catch (e) {
        if (e instanceof ApiError && e.status === 0) return; // no signal: keep and try later
        // refused (not a volunteer any more, window closed on the server…): drop this one
      }
      usePresence.setState((st) => ({ queue: st.queue.slice(1), lastSentAt: Date.now() }));
    }
  } finally {
    sending = false;
  }
}

// ---------- the volunteer's warning (V3) ----------

async function warn(l: Local) {
  usePresence.setState({ lastWarnAt: Date.now() });
  const title = i18n.t('pd.awayTitle');
  const body = i18n.t('pd.awayBody', { m: l.distanceM ?? 0, no: l.partNo ?? '' });
  await showLocal(title, body);
}

if (Platform.OS !== 'web') {
  // Registered at start-up so the phone can wake the app for a reading even when it was closed.
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    await onLocations(data.locations);
  });
}
