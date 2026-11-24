/** TC-OB-1 … TC-OB-5, TC-OB-10, TC-OB-11 (docs/test-cases/onboarding-branding.md). */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const wrap = (ui: ReactElement) => <SafeAreaProvider initialMetrics={METRICS}>{ui}</SafeAreaProvider>;

jest.mock('@/api/client', () => ({ API_MODE: 'http' }));

const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (p: string) => mockReplace(p), push: (p: string) => mockPush(p) },
  Redirect: ({ href }: { href: string }) => {
    const { Text: T } = jest.requireActual('react-native');
    return <T>{`redirect:${href}`}</T>;
  },
  useLocalSearchParams: () => ({}),
}));
const mockGoBack = jest.fn();
jest.mock('@/features/shell/navHistory', () => ({ goBack: () => mockGoBack() }));
let mockMembership: { look?: { bannerUrl?: string | null; appName?: string; languages?: string[] }; partyName: string } | null = null;
const mockSession: { refreshToken: string | null } = { refreshToken: null };
jest.mock('@/stores/session', () => {
  const state = { loaded: true, get refreshToken() { return mockSession.refreshToken; }, load: jest.fn(), me: { user: { name: 'Suresh Kumar', mobile: '9000000003' } } };
  const useSession = Object.assign((sel: (s: typeof state) => unknown) => sel(state), { getState: () => state });
  return { useSession, useActiveMembership: () => mockMembership };
});

// eslint-disable-next-line import/first
import { usePrefs } from '@/stores/prefs';
// eslint-disable-next-line import/first
import Index from '@/app/index';
// eslint-disable-next-line import/first
import Welcome from '@/app/welcome';
// eslint-disable-next-line import/first
import Language from '@/app/language';
// eslint-disable-next-line import/first
import { BrandHeader } from './Brand';
// eslint-disable-next-line import/first
import { LanguageRow } from './LanguageRow';
// eslint-disable-next-line import/first
import { TeamBanner } from './TeamBanner';
// eslint-disable-next-line import/first
import { i18n } from '@/i18n';

beforeEach(() => {
  jest.clearAllMocks();
  usePrefs.setState({ onboarded: false, langChosen: false, lang: 'en' });
  mockMembership = null;
  mockSession.refreshToken = null;
});

describe('first launch (OB1)', () => {
  it('TC-OB-1 signed out: not onboarded → welcome; onboarded → login', async () => {
    await render(wrap(<Index />));
    expect(screen.getByText('redirect:/welcome')).toBeTruthy();
    usePrefs.setState({ onboarded: true });
    await render(wrap(<Index />));
    expect(screen.getByText('redirect:/login')).toBeTruthy();
  });

  it('TC-OB-2 welcome shows English with Hindi; Continue and Skip go to language', async () => {
    await render(wrap(<Welcome />));
    expect(screen.getByText('Welcome to ElVote')).toBeTruthy();
    expect(screen.getByText('ElVote में आपका स्वागत है')).toBeTruthy();
    expect(screen.getByText('Works without internet')).toBeTruthy();
    expect(screen.getByText('बिना इंटरनेट भी काम करता है')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue · जारी रखें' }));
    expect(mockReplace).toHaveBeenLastCalledWith('/language');
    await fireEvent.press(screen.getByRole('button', { name: 'Skip · छोड़ें' }));
    expect(mockReplace).toHaveBeenLastCalledWith('/language');
  });

  it('TC-OB-3 choosing Hindi saves it and opens sign in', async () => {
    await render(wrap(<Language />));
    expect(screen.getByText('Choose your language')).toBeTruthy();
    expect(screen.getByText('अपनी भाषा चुनें')).toBeTruthy();
    await fireEvent.press(screen.getByText('हिन्दी'));
    await fireEvent.press(screen.getByRole('button', { name: 'Continue · जारी रखें' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
    expect(usePrefs.getState()).toMatchObject({ lang: 'hi', langChosen: true, onboarded: true });
    await i18n.changeLanguage('en');
  });

  it('TC-OB-11 signed in (side menu): only team languages, Continue goes back, never to sign in', async () => {
    mockSession.refreshToken = 'rt';
    mockMembership = { partyName: 'Jan Vikas Party', look: { languages: ['pa', 'en'] } };
    usePrefs.setState({ onboarded: true, langChosen: true, lang: 'en' });
    await render(wrap(<Language />));
    expect(screen.queryByText('हिन्दी')).toBeNull();
    await fireEvent.press(screen.getByText('ਪੰਜਾਬੀ'));
    await fireEvent.press(screen.getByRole('button', { name: 'Continue · जारी रखें' }));
    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalledWith('/login');
    expect(usePrefs.getState().lang).toBe('pa');
    await i18n.changeLanguage('en');
  });
});

describe('branding and language (OB4, OB6)', () => {
  it('TC-OB-4 brand header is the ElVote mark + wordmark', async () => {
    await render(<BrandHeader />);
    expect(screen.getByLabelText('ElVote')).toBeTruthy();
  });

  it('TC-OB-5 language row shows the current language and changes it', async () => {
    await render(wrap(<LanguageRow langs={['pa', 'hi', 'en']} />));
    expect(screen.getByText('English')).toBeTruthy();
    await fireEvent.press(screen.getByText(/^Language/));
    await fireEvent.press(screen.getByText('ਪੰਜਾਬੀ'));
    await waitFor(() => expect(i18n.language).toBe('pa'));
    expect(usePrefs.getState().lang).toBe('pa');
    await i18n.changeLanguage('en');
  });
});

describe('team banner (OB8)', () => {
  it('TC-OB-10 nothing without a banner; image when set; Edit for admins', async () => {
    const empty = await render(<TeamBanner />);
    expect(empty.toJSON()).toBeNull();
    mockMembership = { partyName: 'Jan Vikas Party', look: { bannerUrl: '/files/abc.png', appName: 'JVP Rampur' } };
    await render(<><TeamBanner /><Text>end</Text></>);
    expect(screen.getByLabelText('Banner of JVP Rampur')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit Home banner' })).toBeNull();
    await render(<TeamBanner editable />);
    await fireEvent.press(screen.getByRole('button', { name: 'Edit Home banner' }));
    expect(mockPush).toHaveBeenCalledWith('/admin/banner');
  });
});
