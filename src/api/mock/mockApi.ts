/**
 * In-memory mock API (spec O2). Seeded deterministically; simulated latency; optional failure mode.
 * Never logs voter data.
 */
import type { Api, Voter, VoterPatch } from '../types';
import { createSeed } from './seed';

const db = createSeed();
const byId = new Map(db.voters.map((v) => [v.id, v]));

export const mockControl = { latencyMs: 250, fail: false };

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve, reject) =>
    setTimeout(() => (mockControl.fail ? reject(new Error('network')) : resolve(value)), mockControl.latencyMs),
  );

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export const mockApi: Api = {
  getMe: () => delay(clone(db.volunteer)),
  getBooths: () => delay(clone(db.booths)),
  getVoters: (booth) => delay(clone(db.voters.filter((v) => v.booth === booth))),
  getTasks: () => delay(clone(db.tasks)),
  getBranding: () => delay({ partyName: 'Jan Vikas Party', appName: 'JVP Rampur', candidateName: 'Harjit Singh Sandhu', ballotNo: 3, electionName: 'Punjab Assembly 2027', pollDate: '2027-02-14' }),
  updateVoter: (id, patch: VoterPatch) => {
    const v = byId.get(id);
    if (!v) return Promise.reject(new Error('not found'));
    applyPatch(v, patch);
    v.updatedAt = new Date().toISOString();
    return delay(clone(v));
  },
  syncBatch: (_mid, ops) =>
    delay({
      results: ops.map((op) => {
        const v = byId.get(op.voterId);
        if (!v) return { opId: op.opId, status: 'error' as const, code: 'voter_not_found', message: 'Voter not found' };
        if (applied.has(op.opId)) return { opId: op.opId, status: 'duplicate' as const };
        applied.add(op.opId);
        applyPatch(v, op.patch);
        v.updatedAt = new Date().toISOString();
        return { opId: op.opId, status: 'ok' as const };
      }),
    }),
};

const applied = new Set<string>();

/** Applies a patch; `null` clears a field. Shared by the mock DB and optimistic updates. */
export function applyPatch(v: Voter, patch: VoterPatch): Voter {
  for (const [k, val] of Object.entries(patch) as [keyof VoterPatch, unknown][]) {
    if (val === null || val === undefined) delete (v as unknown as Record<string, unknown>)[k];
    else (v as unknown as Record<string, unknown>)[k] = val;
  }
  return v;
}
