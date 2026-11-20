import { logout } from '@/features/session/session';
import { useNotice } from '@/stores/notice';
import { useOutbox } from '@/stores/outbox';

// TC-S7-1: logging out never throws away changes that are still on the phone.
describe('no data loss on logout (sync-modes S7)', () => {
  beforeEach(() => {
    useOutbox.setState({ items: [], problems: [], draining: false, lastSyncedAt: null, lastError: null });
    useNotice.setState({ text: null });
  });

  it('refuses to log out while changes are unsent, and keeps them', async () => {
    useOutbox.getState().enqueue({ voterId: 'a', patch: { group: 'our' } });
    useOutbox.getState().enqueue({ voterId: 'b', patch: { group: 'opp' } });
    await logout();
    expect(useOutbox.getState().items.map((i) => i.voterId)).toEqual(['a', 'b']);
    expect(useNotice.getState().text).toMatch(/2 changes are not sent yet/);
  });
});
