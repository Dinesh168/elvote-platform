/** TC-LD-D4-1: signing out also signs out of Firebase on this device. */
const mockSignOutPhone = jest.fn(async () => undefined);
jest.mock('@/features/auth/firebaseAuth', () => ({ signOutFirebase: () => mockSignOutPhone(), firebaseOn: () => true }));
jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));

// eslint-disable-next-line import/first
import { logout } from '@/features/session/session';

it('logout signs out of Firebase', async () => {
  await logout();
  expect(mockSignOutPhone).toHaveBeenCalled();
});
