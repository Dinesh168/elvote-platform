/** TC-AA-U5: where a person lands after sign-in (spec accounts-access AC4–AC7). */
jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));

// eslint-disable-next-line import/first
import { landing } from './session';
// eslint-disable-next-line import/first
import type { MeInfo } from '@/stores/session';

const base = (p: Partial<MeInfo> = {}): MeInfo => ({
  user: { id: 'u', mobile: '9876543210', email: 'a@b.com', name: 'A', lang: 'en', profileDone: true },
  isSuperAdmin: false,
  memberships: [],
  accessRequest: null,
  ...p,
});
const mem = (status: string, role = 'volunteer') => ({ id: `m-${status}`, role, status }) as unknown as MeInfo['memberships'][number];
const req = (status: string) => ({ id: 'r', status, partyName: 'P', stateCode: 'PB', wholeState: true, acNos: [], designation: 'd', reason: null }) as unknown as NonNullable<MeInfo['accessRequest']>;

describe('landing', () => {
  it('details first', () => {
    expect(landing(base({ user: { ...base().user, mobile: null, profileDone: false } }))).toBe('/profile');
  });
  it('super-admin goes to the platform', () => {
    expect(landing(base({ isSuperAdmin: true }))).toMatchObject({ mode: 'platform' });
  });
  it('approved membership opens the app', () => {
    expect(landing(base({ memberships: [mem('approved', 'admin')] }))).toMatchObject({ mode: 'admin' });
  });
  it('prefers an active team over a paused one', () => {
    const paused = { ...mem('approved', 'admin'), id: 'm-paused', active: false } as MeInfo['memberships'][number];
    const live = { ...mem('approved', 'admin'), id: 'm-live', active: true } as MeInfo['memberships'][number];
    expect(landing(base({ memberships: [paused, live] }))).toMatchObject({ membershipId: 'm-live' });
  });
  it('pending volunteer or admin request waits', () => {
    expect(landing(base({ memberships: [mem('pending')] }))).toBe('/waiting');
    expect(landing(base({ accessRequest: req('pending') }))).toBe('/waiting');
    expect(landing(base({ accessRequest: req('rejected') }))).toBe('/waiting');
  });
  it('nothing yet → choose role', () => {
    expect(landing(base())).toBe('/register');
    expect(landing(base({ accessRequest: req('withdrawn') }))).toBe('/register');
  });
});
