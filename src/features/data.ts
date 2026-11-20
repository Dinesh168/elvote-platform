/**
 * Server-state hooks (TanStack Query) + offline-first writes through the outbox (spec O2, O3).
 * Screens use only these hooks, never the API implementation.
 */
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/client';
import { applyPatch } from '@/api/mock/mockApi';
import type { Booth, Voter, VoterPatch } from '@/api/types';
import { requestSync, setOnSynced, useSyncState } from '@/features/sync/engine';
import { durable } from '@/lib/durable';
import { useOutbox } from '@/stores/outbox';
import { localizeBooth, localizeVoter, showRegional } from '@/features/session/localize';
import { activeMembership, useActiveMembership } from '@/stores/session';

/** Data kept on the device for 30 days so the app works without internet after a restart (spec sync-modes S1). */
export const CACHE_MAX_AGE = 30 * 24 * 60 * 60_000;
export const queryClient = new QueryClient({
  // gcTime must be Infinity, not 30 days: timers longer than ~24.8 days (2^31 ms) overflow and fire at once,
  // which threw the restored offline data away immediately. The device copy itself expires after CACHE_MAX_AGE.
  defaultOptions: { queries: { staleTime: 60_000, gcTime: Infinity, retry: 2, networkMode: 'offlineFirst' } },
});

/** On-device copy of the volunteer's booths, voters, tasks and branding (SQLite on phones, IndexedDB on the web). */
export const CACHE_KEY = 'elvote.cache.v1';
export const persister = createAsyncStoragePersister({ storage: durable, key: CACHE_KEY, throttleTime: 1000 });
const KEEP = new Set(['voters', 'booths', 'tasks', 'branding', 'me']);
export const persistOptions = {
  persister,
  maxAge: CACHE_MAX_AGE,
  buster: 'v1',
  // Keep anything that holds data — also when the last refresh failed (offline): the data is still good.
  dehydrateOptions: { shouldDehydrateQuery: (q: { queryKey: readonly unknown[]; state: { dataUpdatedAt: number } }) => q.state.dataUpdatedAt > 0 && KEEP.has(String(q.queryKey[0])) },
};

/** Logout: forget this person's data on the device (only called when nothing is waiting to be sent). */
export async function clearDeviceCache() {
  queryClient.clear();
  await durable.removeItem(CACHE_KEY).catch(() => undefined);
}

export const keys = {
  me: ['me'] as const,
  booths: ['booths'] as const,
  tasks: ['tasks'] as const,
  branding: ['branding'] as const,
  voters: (booth: number) => ['voters', booth] as const,
};

export const useMe = () => useQuery({ queryKey: keys.me, queryFn: api.getMe });
/** spec bilingual-roll L3: show regional names when the app language is this assembly's data language. */
function useRegionalData() {
  const { i18n } = useTranslation();
  return showRegional(i18n.language, useActiveMembership()?.dataLang);
}

export const useBooths = () => {
  const regional = useRegionalData();
  const select = useCallback((list: Booth[]) => list.map((b) => localizeBooth(b, regional)), [regional]);
  return useQuery({ queryKey: keys.booths, queryFn: api.getBooths, select });
};
export const useTasks = () => useQuery({ queryKey: keys.tasks, queryFn: api.getTasks });
export const useBranding = () => useQuery({ queryKey: keys.branding, queryFn: api.getBranding, staleTime: 10 * 60_000 });
/** Changes still waiting to be sent stay visible after a refresh from the server (spec sync-modes S2). */
function withPending(booth: number, list: Voter[]): Voter[] {
  const pending = useOutbox.getState().items.filter((w) => w.booth === booth);
  if (!pending.length) return list;
  const byId = new Map(list.map((v) => [v.id, v]));
  for (const w of pending) {
    const v = byId.get(w.voterId);
    if (v) applyPatch(v, w.patch);
  }
  return list;
}

export const useVoters = (booth: number) => {
  const regional = useRegionalData();
  const select = useCallback((list: Voter[]) => list.map((v) => localizeVoter(v, regional)), [regional]);
  return useQuery({ queryKey: keys.voters(booth), queryFn: async () => withPending(booth, await api.getVoters(booth)), select });
};

function patchCache(booth: number, id: string, patch: VoterPatch) {
  queryClient.setQueryData<Voter[]>(keys.voters(booth), (old) =>
    old?.map((v) => (v.id === id ? applyPatch({ ...v }, patch) : v)),
  );
}

/** Sends what is waiting now, whatever the mode (Sync now button). */
export function syncNow() {
  return requestSync('manual');
}

// After the server confirms changes, refresh lists in the background (others' work, admin tasks).
setOnSynced(() => {
  void queryClient.invalidateQueries({ queryKey: ['voters'] });
  void queryClient.invalidateQueries({ queryKey: keys.tasks });
});

export interface SaveHandle {
  undo: () => void;
}

/**
 * Saves a change to a voter: updates the screen at once (optimistic), queues it, then syncs.
 * Returns an Undo handle that removes the queued write, or queues the reverse change if already sent.
 */
export function saveVoter(before: Voter, patch: VoterPatch): SaveHandle {
  patchCache(before.booth, before.id, patch);
  const mid = activeMembership()?.id ?? null;
  const writeId = useOutbox.getState().enqueue({ voterId: before.id, booth: before.booth, mid, patch });
  void requestSync('change');
  return {
    undo: () => {
      const reverse: VoterPatch = {};
      for (const k of Object.keys(patch) as (keyof VoterPatch)[]) {
        (reverse as Record<string, unknown>)[k] = before[k as keyof Voter] ?? null;
      }
      patchCache(before.booth, before.id, reverse);
      const queued = useOutbox.getState().items.some((i) => i.id === writeId);
      if (queued) useOutbox.getState().remove(writeId);
      else {
        useOutbox.getState().enqueue({ voterId: before.id, booth: before.booth, mid, patch: reverse });
        void requestSync('change');
      }
    },
  };
}

/** Online status (the sync engine listens to the network and sends when the mode allows). */
export function useOnline() {
  return useSyncState((st) => st.online);
}

export const useQC = useQueryClient;

