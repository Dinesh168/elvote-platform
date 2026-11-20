/**
 * Offline write queue (spec O3, sync-modes S2/S4/S5). Every change is queued here first, stored durably on the
 * device, and sent in order in batches. A change the server permanently refuses is moved to `problems`
 * (kept on the device, shown to the volunteer) so it never blocks the rest. Nothing is dropped silently.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { VoterPatch } from '@/api/types';
import { durable } from '@/lib/durable';
import { uuid } from '@/lib/uuid';

export const OUTBOX_KEY = 'elvote.outbox.v1';
export const BATCH_SIZE = 100;

export interface Write {
  id: string; // also the idempotency key (opId) sent to the server
  voterId: string;
  booth?: number;
  /** Membership (team) the change belongs to; sent to that team even after a role switch. */
  mid?: string | null;
  patch: VoterPatch;
  /** Phone time of the change (sent as clientAt; the server's conflict rule uses it). */
  at: string;
}

export interface Problem { write: Write; code: string; message: string; at: string }
export type OpResult = { opId: string; status: 'ok' | 'duplicate' | 'error'; code?: string; message?: string };
/** Sends one batch (same team, in order). Throws on network/auth failure (everything is kept). */
export type SendBatch = (mid: string | null, writes: Write[], unsentAfter: number) => Promise<OpResult[]>;

interface OutboxState {
  items: Write[];
  problems: Problem[];
  lastSyncedAt: string | null;
  lastError: string | null;
  draining: boolean;
  enqueue: (w: { voterId: string; booth?: number; mid?: string | null; patch: VoterPatch; at?: string }) => string;
  remove: (id: string) => void;
  /** Sends queued writes for the given teams (null = all). Returns how many were confirmed. */
  drain: (send: SendBatch, onlyMids?: (string | null)[] | null) => Promise<number>;
  retryProblem: (id: string) => void;
  dismissProblem: (id: string) => void;
}

export const useOutbox = create<OutboxState>()(
  persist(
    (set, get) => ({
      items: [],
      problems: [],
      lastSyncedAt: null,
      lastError: null,
      draining: false,
      enqueue: ({ voterId, booth, mid, patch, at }) => {
        const id = uuid();
        set((s) => ({ items: [...s.items, { id, voterId, booth, mid: mid ?? null, patch, at: at ?? new Date().toISOString() }] }));
        return id;
      },
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      drain: async (send, onlyMids = null) => {
        if (get().draining) return 0;
        set({ draining: true });
        let confirmed = 0;
        try {
          for (;;) {
            const pending = get().items.filter((w) => !onlyMids || onlyMids.includes(w.mid ?? null));
            if (!pending.length) break;
            // One batch: consecutive writes of the same team, oldest first, up to BATCH_SIZE.
            const team = pending[0].mid ?? null;
            const chunk: Write[] = [];
            for (const w of pending) {
              if ((w.mid ?? null) !== team || chunk.length >= BATCH_SIZE) break;
              chunk.push(w);
            }
            let results: OpResult[];
            try {
              results = await send(team, chunk, get().items.length - chunk.length);
            } catch (e) {
              set({ lastError: (e as Error).message });
              break; // network/auth: keep everything, in order, try again later
            }
            const byId = new Map(results.map((r) => [r.opId, r]));
            const done = new Set<string>();
            const failed: Problem[] = [];
            for (const w of chunk) {
              const r = byId.get(w.id);
              if (!r) continue; // no answer for this one: keep it
              done.add(w.id);
              if (r.status === 'error') failed.push({ write: w, code: r.code ?? 'error', message: r.message ?? '', at: new Date().toISOString() });
              else confirmed++;
            }
            if (!done.size) break; // server answered nothing usable: stop, keep all
            set((s) => ({
              items: s.items.filter((i) => !done.has(i.id)),
              problems: [...s.problems, ...failed],
              lastSyncedAt: new Date().toISOString(),
              lastError: null,
            }));
          }
        } finally {
          set({ draining: false });
        }
        return confirmed;
      },
      retryProblem: (id) =>
        set((s) => {
          const p = s.problems.find((x) => x.write.id === id);
          return p ? { problems: s.problems.filter((x) => x.write.id !== id), items: [...s.items, p.write] } : s;
        }),
      dismissProblem: (id) => set((s) => ({ problems: s.problems.filter((x) => x.write.id !== id) })),
    }),
    {
      name: OUTBOX_KEY,
      storage: createJSONStorage(() => durable),
      partialize: (s) => ({ items: s.items, problems: s.problems, lastSyncedAt: s.lastSyncedAt }),
    },
  ),
);
