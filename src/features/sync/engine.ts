/**
 * Sync engine (spec sync-modes S3). The super-admin sets the mode per customer:
 * - live: send on every change, on reconnect and when the app comes to the front;
 * - offline: send only when the volunteer taps Sync now;
 * - scheduled: send every N minutes, and on reconnect / app front when N minutes have passed.
 * Whatever happens, changes stay in the on-device queue until the server confirms them.
 */
import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { api } from '@/api/client';
import { useOutbox, type OpResult, type Write } from '@/stores/outbox';
import { activeMembership, useSession } from '@/stores/session';

export type SyncMode = 'live' | 'offline' | 'scheduled';
export type SyncReason = 'change' | 'manual' | 'online' | 'foreground' | 'timer';
export interface SyncConfig { mode: SyncMode; minutes: number }

export const DEFAULT_SYNC: SyncConfig = { mode: 'live', minutes: 15 };
/** Live mode: how often to retry waiting changes when sending failed. */
export const LIVE_RETRY_MS = 30_000;

/** Pure rule (unit-tested): should this event start a sync? */
export function shouldSync(cfg: SyncConfig, reason: SyncReason, lastSyncAt: string | null, now = Date.now()): boolean {
  if (reason === 'manual') return true;
  if (cfg.mode === 'offline') return false;
  if (cfg.mode === 'live') return true;
  if (reason === 'change') return false; // scheduled: changes wait for the timer
  return !lastSyncAt || now - Date.parse(lastSyncAt) >= cfg.minutes * 60_000;
}

/** Next scheduled sync time (for the status chip), or null when not scheduled. */
export function nextSyncAt(cfg: SyncConfig, lastSyncAt: string | null, now = Date.now()): number | null {
  if (cfg.mode !== 'scheduled') return null;
  return lastSyncAt ? Math.max(now, Date.parse(lastSyncAt) + cfg.minutes * 60_000) : now;
}

/** The open team's sync settings (remembered offline with the rest of /v1/me). */
export function currentSync(): SyncConfig {
  const s = activeMembership()?.sync;
  return s ? { mode: s.mode, minutes: Math.min(120, Math.max(1, s.minutes)) } : DEFAULT_SYNC;
}

export const useSyncState = create<{ online: boolean; lastTryAt: string | null; lastTickAt: number }>()(() => ({ online: true, lastTryAt: null, lastTickAt: Date.now() }));

const toOps = (ws: Write[]) => ws.map((w) => ({ opId: w.id, voterId: w.voterId, clientAt: w.at, patch: w.patch }));

/** Sends what is queued for the signed-in person's teams. Never throws. */
async function run(): Promise<number> {
  const me = useSession.getState().me;
  if (!me) return 0;
  const mids = me.memberships.filter((m) => m.status === 'approved').map((m) => m.id as string | null);
  useSyncState.setState({ lastTryAt: new Date().toISOString() });
  const n = await useOutbox.getState().drain(async (mid, writes, unsentAfter): Promise<OpResult[]> => {
    const r = await api.syncBatch(mid, toOps(writes), unsentAfter);
    return r.results;
  }, [...mids, null]);
  if (n > 0) onSynced?.();
  return n;
}

let onSynced: (() => void) | null = null;
/** Called after changes were confirmed (data layer refreshes the volunteer's lists). */
export function setOnSynced(fn: () => void) {
  onSynced = fn;
}

/** Ask for a sync; the mode decides whether it happens now. */
export function requestSync(reason: SyncReason): Promise<number> {
  const cfg = currentSync();
  const last = useOutbox.getState().lastSyncedAt ?? useSyncState.getState().lastTryAt;
  if (!useOutbox.getState().items.length && reason !== 'manual') return Promise.resolve(0);
  if (!shouldSync(cfg, reason, reason === 'timer' ? useSyncState.getState().lastTryAt : last)) return Promise.resolve(0);
  return run();
}

/** Mounted once in the volunteer and admin areas: network, app-front and timer triggers. */
export function useSyncEngine() {
  useEffect(() => {
    const offNet = NetInfo.addEventListener((s) => {
      const on = s.isConnected !== false && s.isInternetReachable !== false;
      const was = useSyncState.getState().online;
      useSyncState.setState({ online: on });
      if (on && !was) void requestSync('online');
    });
    const offApp = AppState.addEventListener('change', (st) => {
      if (st === 'active') void requestSync('foreground');
    });
    const tick = setInterval(() => {
      useSyncState.setState({ lastTickAt: Date.now() });
      const mode = currentSync().mode;
      if (mode === 'scheduled') void requestSync('timer');
      // Live: the phone may say "online" while the server is unreachable (weak signal, Wi-Fi login page).
      // Retry waiting changes every 30 s so they never sit until the next change.
      const last = useSyncState.getState().lastTryAt;
      if (mode === 'live' && useOutbox.getState().items.length && (!last || Date.now() - Date.parse(last) >= LIVE_RETRY_MS)) void requestSync('timer');
    }, 15_000);
    void requestSync('foreground');
    return () => {
      offNet();
      offApp.remove();
      clearInterval(tick);
    };
  }, []);
}
