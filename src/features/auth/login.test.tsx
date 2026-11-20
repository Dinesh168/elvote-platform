/** TC-AA-U1, TC-AA-U2 (docs/test-cases/accounts-access.md): sign-in screen in Firebase mode. */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { authMessage, isCancelled } from './errors';

const mockGoogle = jest.fn(async () => 'google-id-token-0123456789');
const mockEmailSignIn = jest.fn(async (_e: string, _p: string): Promise<{ token?: string; unverified?: boolean }> => ({ token: 'email-id-token-0123456789' }));
const mockEmailCreate = jest.fn(async () => undefined);
const mockVerified = jest.fn(async (): Promise<string | null> => null);
const mockReset = jest.fn(async () => undefined);
let mockOn = true;
jest.mock('./firebaseAuth', () => ({
  firebaseOn: () => mockOn,
  googleAvailable: () => true,
  googleSignIn: () => mockGoogle(),
  redirectToken: async () => null,
  emailSignIn: (e: string, p: string) => mockEmailSignIn(e, p),
  emailCreate: () => mockEmailCreate(),
  resendVerification: async () => undefined,
  verifiedToken: () => mockVerified(),
  resetPassword: () => mockReset(),
}));
const mockFirebase = jest.fn(async () => ({ accessToken: 'a', refreshToken: 'r' }));
const mockRequestOtp = jest.fn(async () => ({ sent: true, devCode: '123456' }));
jest.mock('@/api/adminApi', () => ({
  authApi: {
    firebase: (...a: unknown[]) => mockFirebase(...(a as [])),
    requestOtp: (...a: unknown[]) => mockRequestOtp(...(a as [])),
    verifyOtp: async () => ({ accessToken: 'a', refreshToken: 'r' }),
  },
}));
const mockGoLanding = jest.fn(async () => undefined);
jest.mock('@/features/session/session', () => ({ goLanding: () => mockGoLanding() }));
jest.mock('@/features/shell/AuthScreen', () => ({ AuthScreen: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('@/stores/session', () => ({ useSession: { getState: () => ({ setTokens: jest.fn(async () => undefined) }) } }));

// eslint-disable-next-line import/first
import Login from '@/app/login';

beforeEach(() => {
  jest.clearAllMocks();
  mockOn = true;
});

describe('Firebase sign-in (AC1, AC2)', () => {
  it('Continue with Google → server session → landing; no mobile or code fields', async () => {
    await render(<Login />);
    expect(screen.queryByLabelText('Mobile number')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));
    await waitFor(() => expect(mockFirebase).toHaveBeenCalledWith('google-id-token-0123456789'));
    expect(mockGoLanding).toHaveBeenCalled();
  });

  it('email sign-in', async () => {
    await render(<Login />);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'a@b.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'secret123');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(mockEmailSignIn).toHaveBeenCalledWith('a@b.com', 'secret123'));
    expect(mockFirebase).toHaveBeenCalledWith('email-id-token-0123456789');
  });

  it('wrong password shows a plain message', async () => {
    mockEmailSignIn.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'auth/invalid-credential' }));
    await render(<Login />);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'a@b.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'nope1234');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Wrong email or password.')).toBeTruthy();
    expect(mockFirebase).not.toHaveBeenCalled();
  });

  it('create account → check your email → continue once verified', async () => {
    await render(<Login />);
    await fireEvent.press(screen.getByRole('button', { name: 'Create an account' }));
    await fireEvent.changeText(screen.getByLabelText('Email'), 'new@b.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'short');
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Password'), 'longenough1');
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText(/We sent a link to new@b.com/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: "I've verified, continue" }));
    expect(await screen.findByText('Not verified yet. Open the link in the email first.')).toBeTruthy();
    mockVerified.mockResolvedValueOnce('verified-token-0123456789');
    await fireEvent.press(screen.getByRole('button', { name: "I've verified, continue" }));
    await waitFor(() => expect(mockFirebase).toHaveBeenCalledWith('verified-token-0123456789'));
  });

  it('forgot password sends a reset email', async () => {
    await render(<Login />);
    await fireEvent.press(screen.getByRole('button', { name: 'Forgot password?' }));
    await fireEvent.changeText(screen.getByLabelText('Email'), 'a@b.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByText(/Check your email/)).toBeTruthy();
    expect(mockReset).toHaveBeenCalled();
  });

  it('closing the Google window shows nothing', async () => {
    mockGoogle.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'auth/popup-closed-by-user' }));
    await render(<Login />);
    await fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));
    await waitFor(() => expect(mockGoogle).toHaveBeenCalled());
    expect(screen.queryByText(/Could not sign in/)).toBeNull();
  });
});

describe('dev sign-in (local and tests only)', () => {
  it('keeps the mobile + test code flow', async () => {
    mockOn = false;
    await render(<Login />);
    await fireEvent.changeText(screen.getByLabelText('Mobile number'), '9876543210');
    await fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
    expect(mockRequestOtp).toHaveBeenCalledWith('9876543210');
    expect(await screen.findByText('Test mode: the code is 123456')).toBeTruthy();
  });
});

describe('error messages (TC-AA-U2)', () => {
  const t = (k: string) => k;
  it.each([
    ['auth/invalid-credential', 'auth.wrongPassword'],
    ['auth/user-not-found', 'auth.noAccount'],
    ['auth/email-already-in-use', 'auth.emailInUse'],
    ['auth/weak-password', 'auth.weakPassword'],
    ['auth/too-many-requests', 'auth.tooMany'],
    ['auth/network-request-failed', 'auth.noInternet'],
    ['auth/account-exists-with-different-credential', 'auth.otherMethod'],
    ['x/other', 'auth.signInFailed'],
  ])('%s → %s', (c, k) => expect(authMessage(Object.assign(new Error(''), { code: c }), t)).toBe(k));
  it('cancel is not an error', () => {
    expect(isCancelled({ code: 'auth/popup-closed-by-user' })).toBe(true);
    expect(isCancelled({ code: 'auth/invalid-credential' })).toBe(false);
  });
});
