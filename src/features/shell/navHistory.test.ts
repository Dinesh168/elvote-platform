/** spec nav-back TC-NB-1..3: Back goes to where you came from, across tabs too. */
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), navigate: jest.fn(), replace: jest.fn(), dismiss: jest.fn(), canGoBack: jest.fn(() => true), canDismiss: jest.fn(() => true) },
  usePathname: jest.fn(), useSegments: jest.fn(), useGlobalSearchParams: jest.fn(),
}));

// eslint-disable-next-line import/first
import { router } from 'expo-router';
// eslint-disable-next-line import/first
import { _history, backLeavesTab, goBack } from './navHistory';

const mockRouter = router as unknown as Record<'back' | 'navigate' | 'replace' | 'dismiss' | 'canGoBack' | 'canDismiss', jest.Mock>;

const set = (...e: { path: string; tab: string; params?: Record<string, string> }[]) => {
  _history.splice(0, _history.length, ...e.map((x) => ({ params: {}, ...x })));
};

beforeEach(() => jest.clearAllMocks());

describe('Back', () => {
  it('TC-NB-1 same tab: router.back()', () => {
    set({ path: '/admin/dashboard', tab: 'admin/(dashboard)' }, { path: '/admin/booth', tab: 'admin/(dashboard)' });
    expect(backLeavesTab()).toBe(false);
    goBack();
    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('TC-NB-2 opened from another tab (Map → booth): back to the Map, booth taken off the dashboard stack', () => {
    set({ path: '/admin/map', tab: 'admin/map', params: { mode: 'result' } }, { path: '/admin/booth', tab: 'admin/(dashboard)', params: { no: '101' } });
    expect(backLeavesTab()).toBe(true);
    goBack();
    expect(mockRouter.dismiss).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith({ pathname: '/admin/map', params: { mode: 'result' } });
  });

  it('TC-NB-3 nothing before: back if possible, else home', () => {
    set({ path: '/admin/booth', tab: 'admin/(dashboard)' });
    mockRouter.canGoBack.mockReturnValueOnce(false);
    goBack();
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });
});
