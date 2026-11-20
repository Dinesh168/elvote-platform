import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SYNC, nextSyncAt, shouldSync } from '@/features/sync/engine';
import { BATCH_SIZE, OUTBOX_KEY, useOutbox, type OpResult, type SendBatch, type Write } from './outbox';

const reset = () => useOutbox.setState({ items: [], problems: [], lastSyncedAt: null, lastError: null, draining: false });
const okAll: SendBatch = async (_mid, ws) => ws.map((w) => ({ opId: w.id, status: 'ok' as const }));

describe('outbox (O3, sync-modes S2/S4/S5)', () => {
  beforeEach(async () => {
    reset();
    await AsyncStorage.clear();
  });

  it('TC-O3-1 queues writes in order', () => {
    const { enqueue } = useOutbox.getState();
    enqueue({ voterId: '112-1', patch: { group: 'our' } });
    enqueue({ voterId: '112-2', patch: { group: 'opp' } });
    enqueue({ voterId: '112-3', patch: { needsHelp: true } });
    expect(useOutbox.getState().items.map((i) => i.voterId)).toEqual(['112-1', '112-2', '112-3']);
  });

  it('TC-O3-3 persists to device storage', async () => {
    useOutbox.getState().enqueue({ voterId: 'p', patch: { group: 'target' } });
    await new Promise((r) => setTimeout(r, 0));
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    expect(raw).toContain('"voterId":"p"');
  });

  it('TC-O3-4 keeps two changes to the same voter, in order', async () => {
    const { enqueue, drain } = useOutbox.getState();
    enqueue({ voterId: 'x', patch: { group: 'our' } });
    enqueue({ voterId: 'x', patch: { group: 'opp' } });
    const seen: unknown[] = [];
    await drain(async (_m, ws) => { ws.forEach((w) => seen.push(w.patch.group)); return okAll(_m, ws, 0); });
    expect(seen).toEqual(['our', 'opp']);
    expect(useOutbox.getState().items).toEqual([]);
  });

  it('TC-O3-5 removes a write on undo', () => {
    const id = useOutbox.getState().enqueue({ voterId: 'u', patch: { group: 'our' } });
    useOutbox.getState().remove(id);
    expect(useOutbox.getState().items).toEqual([]);
  });

  it('TC-S2-1 the change time is the phone time when it was made, not when it is sent', async () => {
    useOutbox.getState().enqueue({ voterId: 't', patch: { group: 'our' }, at: '2026-11-19T10:00:00.000Z' });
    let sent: Write[] = [];
    await useOutbox.getState().drain(async (m, ws) => { sent = ws; return okAll(m, ws, 0); });
    expect(sent[0].at).toBe('2026-11-19T10:00:00.000Z');
  });

  it('TC-S5-1 a refused change goes to "needs attention"; the others are still sent', async () => {
    const { enqueue, drain } = useOutbox.getState();
    enqueue({ voterId: 'a', patch: { group: 'our' } });
    const bad = enqueue({ voterId: 'b', patch: { group: 'our' } });
    enqueue({ voterId: 'c', patch: { group: 'our' } });
    const n = await drain(async (_m, ws) => ws.map((w): OpResult => (w.id === bad ? { opId: w.id, status: 'error', code: 'booth_forbidden', message: 'Not your booth' } : { opId: w.id, status: 'ok' })));
    expect(n).toBe(2);
    expect(useOutbox.getState().items).toEqual([]);
    expect(useOutbox.getState().problems.map((p) => [p.write.voterId, p.code])).toEqual([['b', 'booth_forbidden']]);
    useOutbox.getState().retryProblem(bad);
    expect(useOutbox.getState().items.map((i) => i.voterId)).toEqual(['b']);
    expect(useOutbox.getState().problems).toEqual([]);
  });

  it('TC-S5-2 a network error keeps the unsent batches, in order', async () => {
    const { enqueue, drain } = useOutbox.getState();
    for (let i = 0; i < BATCH_SIZE * 2 + 5; i++) enqueue({ voterId: `v${i}`, patch: { group: 'our' } });
    let calls = 0;
    await drain(async (m, ws) => {
      calls++;
      if (calls === 2) throw new Error('network');
      return okAll(m, ws, 0);
    });
    const left = useOutbox.getState().items;
    expect(left.length).toBe(BATCH_SIZE + 5);
    expect(left[0].voterId).toBe(`v${BATCH_SIZE}`);
    expect(useOutbox.getState().lastError).toBe('network');
  });

  it('sends each team’s changes to that team, and leaves other people’s changes alone', async () => {
    const { enqueue, drain } = useOutbox.getState();
    enqueue({ voterId: 'a', mid: 'team-1', patch: { group: 'our' } });
    enqueue({ voterId: 'b', mid: 'team-2', patch: { group: 'our' } });
    enqueue({ voterId: 'c', mid: 'someone-else', patch: { group: 'our' } });
    const calls: [string | null, string[]][] = [];
    await drain(async (m, ws) => { calls.push([m, ws.map((w) => w.voterId)]); return okAll(m, ws, 0); }, ['team-1', 'team-2']);
    expect(calls).toEqual([['team-1', ['a']], ['team-2', ['b']]]);
    expect(useOutbox.getState().items.map((i) => i.voterId)).toEqual(['c']);
  });
});

describe('sync rules (TC-S3-2)', () => {
  const now = Date.parse('2026-11-19T10:30:00Z');
  const ago = (min: number) => new Date(now - min * 60_000).toISOString();
  it('live sends on every event', () => {
    for (const r of ['change', 'online', 'foreground', 'timer', 'manual'] as const) expect(shouldSync(DEFAULT_SYNC, r, ago(0), now)).toBe(true);
  });
  it('offline sends only on Sync now', () => {
    const cfg = { mode: 'offline' as const, minutes: 15 };
    expect(['change', 'online', 'foreground', 'timer'].map((r) => shouldSync(cfg, r as 'change', null, now))).toEqual([false, false, false, false]);
    expect(shouldSync(cfg, 'manual', null, now)).toBe(true);
  });
  it('scheduled waits for the timer; reconnect sends only when the time has passed', () => {
    const cfg = { mode: 'scheduled' as const, minutes: 20 };
    expect(shouldSync(cfg, 'change', null, now)).toBe(false);
    expect(shouldSync(cfg, 'timer', ago(10), now)).toBe(false);
    expect(shouldSync(cfg, 'timer', ago(20), now)).toBe(true);
    expect(shouldSync(cfg, 'online', ago(5), now)).toBe(false);
    expect(shouldSync(cfg, 'online', ago(25), now)).toBe(true);
    expect(nextSyncAt(cfg, ago(5), now)).toBe(now + 15 * 60_000);
  });
});
