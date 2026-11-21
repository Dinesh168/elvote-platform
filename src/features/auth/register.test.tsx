/** TC-AA-U3, TC-AA-U4: Your details, choose role, admin request form. */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const withQuery = (ui: React.ReactElement) => (
  <SafeAreaProvider initialMetrics={METRICS}>
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>
  </SafeAreaProvider>
);

const mockProfile = jest.fn(async (_p: unknown) => ({ ok: true }));
const mockRequest = jest.fn(async (_p: unknown) => ({ id: 'r1' }));
jest.mock('@/api/adminApi', () => ({
  authApi: {
    profile: (p: unknown) => mockProfile(p),
    accessRequest: (p: unknown) => mockRequest(p),
    states: async () => [{ code: 'PB', name: 'Punjab' }, { code: 'HR', name: 'Haryana' }],
    acs: async () => [{ acNo: 66, name: 'Rampur' }, { acNo: 50, name: 'Nawanpind' }],
    parties: async () => [{ id: 'p1', name: 'Jan Vikas Party' }],
  },
}));
const mockGoLanding = jest.fn(async () => undefined);
jest.mock('@/features/session/session', () => ({ goLanding: () => mockGoLanding(), logout: jest.fn() }));
jest.mock('@/features/shell/AuthScreen', () => ({ AuthScreen: ({ children }: { children: React.ReactNode }) => children }));
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ router: { replace: (p: string) => mockReplace(p), push: (p: string) => mockReplace(p) } }));
jest.mock('@/stores/session', () => ({
  useSession: Object.assign(
    (sel: (s: unknown) => unknown) => sel({ me: { user: { name: 'From Google', mobile: null, email: 'a@b.com', lang: 'en' } } }),
    { getState: () => ({ me: { user: { name: 'From Google', mobile: null, email: 'a@b.com', lang: 'en' } } }) },
  ),
}));

// eslint-disable-next-line import/first
import Profile from '@/app/profile';
// eslint-disable-next-line import/first
import Register from '@/app/register';
// eslint-disable-next-line import/first
import RegisterAdmin from '@/app/register-admin';
// eslint-disable-next-line import/first
import { ApiError } from '@/api/http';

beforeEach(() => jest.clearAllMocks());

describe('Your details (AC4)', () => {
  it('pre-fills the name, needs a valid mobile, saves', async () => {
    await render(<Profile />);
    expect(screen.getByLabelText('Full name').props.value).toBe('From Google');
    const save = screen.getByRole('button', { name: 'Continue' });
    await fireEvent.changeText(screen.getByLabelText('Mobile number'), '12345');
    expect(save).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Mobile number'), '9876543210');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(mockProfile).toHaveBeenCalledWith({ name: 'From Google', mobile: '9876543210', lang: 'en' }));
    expect(mockGoLanding).toHaveBeenCalled();
  });

  it('mobile used by another account', async () => {
    mockProfile.mockRejectedValueOnce(new ApiError(409, 'mobile_taken', 'server text'));
    await render(<Profile />);
    await fireEvent.changeText(screen.getByLabelText('Mobile number'), '9876543210');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText(/already used by another account/)).toBeTruthy();
  });
});

describe('choose role (AC5)', () => {
  it('volunteer → join, admin → admin request', async () => {
    await render(<Register />);
    await fireEvent.press(screen.getByRole('button', { name: /Volunteer/ }));
    expect(mockReplace).toHaveBeenLastCalledWith('/join');
    await fireEvent.press(screen.getByRole('button', { name: /Admin/ }));
    expect(mockReplace).toHaveBeenLastCalledWith('/register-admin');
  });
});

describe('admin request (AC6)', () => {
  it('needs party, state, area and designation; sends whole state', async () => {
    await render(withQuery(<RegisterAdmin />));
    const send = await screen.findByRole('button', { name: 'Send request' });
    expect(send).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Party name'), 'Jan Vikas Party');
    await fireEvent.press(await screen.findByRole('radio', { name: 'Punjab' }));
    // spec usability-r2 A1: assemblies are chosen on their own page (whole state or a list).
    await fireEvent.press(await screen.findByText('Your assemblies'));
    await fireEvent.press(await screen.findByText('Whole state (2)'));
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await fireEvent.changeText(screen.getByLabelText('Your position in the party'), 'State secretary');
    await fireEvent.press(screen.getByRole('button', { name: 'Send request' }));
    await waitFor(() => expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({ partyName: 'Jan Vikas Party', stateCode: 'PB', wholeState: true, designation: 'State secretary' })));
    expect(mockGoLanding).toHaveBeenCalled();
  });

  it('assemblies mode needs at least one assembly', async () => {
    await render(withQuery(<RegisterAdmin />));
    await fireEvent.changeText(screen.getByLabelText('Party name'), 'Jan Vikas Party');
    await fireEvent.press(await screen.findByRole('radio', { name: 'Punjab' }));
    await fireEvent.changeText(screen.getByLabelText('Your position in the party'), 'Halqa incharge');
    expect(screen.getByRole('button', { name: 'Send request' })).toBeDisabled();
    await fireEvent.press(await screen.findByText('Your assemblies'));
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Search name or number'), '66');
    expect(screen.queryByRole('checkbox', { name: /50 Nawanpind/ })).toBeNull();
    await fireEvent.press(await screen.findByRole('checkbox', { name: /66 Rampur/ }));
    expect(screen.getByText('1 of 2 assemblies selected')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Send request' }));
    await waitFor(() => expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({ wholeState: false, acNos: [66] })));
  });
});
