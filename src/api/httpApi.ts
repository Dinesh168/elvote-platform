/** Volunteer API over HTTP (same contract as the mock). Scoped to the active membership. */
import { activeMembership, useSession } from '@/stores/session';
import { uuid } from '@/lib/uuid';
import { http } from './http';
import type { Api, Booth, Branding, SyncResult, Task, Voter, VoterPatch } from './types';

function mid() {
  const m = activeMembership();
  if (!m) throw new Error('No active membership');
  return m.id;
}

export const httpApi: Api = {
  getMe: async () => {
    const s = useSession.getState();
    const m = activeMembership();
    return { id: s.me?.user.id ?? '', name: s.me?.user.name ?? '', mobile: s.me?.user.mobile ?? '', booths: m?.booths ?? [], status: m?.status === 'approved' ? 'approved' : 'pending' };
  },
  getBooths: () => http.get<Booth[]>(`/v1/m/${mid()}/booths`),
  getVoters: async (booth) => (await http.get<{ voters: Voter[] }>(`/v1/m/${mid()}/voters?booth=${booth}`)).voters,
  getTasks: () => http.get<Task[]>(`/v1/m/${mid()}/tasks`),
  getBranding: () => http.get<Branding>(`/v1/m/${mid()}/branding`),
  updateVoter: (id: string, patch: VoterPatch, meta?: { opId: string }) =>
    http.post<Voter>(`/v1/m/${mid()}/voters/${id}/changes`, { opId: meta?.opId ?? uuid(), clientAt: new Date().toISOString(), patch }),
  syncBatch: (teamMid, ops, unsent) => http.post<{ results: SyncResult[] }>(`/v1/m/${teamMid ?? mid()}/changes/batch`, { ops, unsent }),
};
