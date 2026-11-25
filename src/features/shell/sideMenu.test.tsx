/** TC-MT-24 tips once; TC-MT-28 side menu shows only the role's pages (docs/test-cases/map-trend.md). */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const wrap = (ui: ReactElement) => <SafeAreaProvider initialMetrics={METRICS}>{ui}</SafeAreaProvider>;

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (p: string) => mockPush(p) } }));
let mockMembership: { role: 'admin' | 'volunteer'; partyName: string; features: Record<string, boolean>; look?: { appName?: string } } | null = null;
jest.mock('@/stores/session', () => {
  const state = { me: { user: { name: 'Suresh Kumar' } } };
  const useSession = Object.assign((sel: (s: typeof state) => unknown) => sel(state), { getState: () => state });
  return { useSession, useActiveMembership: () => mockMembership };
});

// eslint-disable-next-line import/first
import { usePrefs } from '@/stores/prefs';
// eslint-disable-next-line import/first
import { Tips } from '@/features/home/Tips';
// eslint-disable-next-line import/first
import { SideMenu } from './SideMenu';

describe('side menu', () => {
  it('TC-MT-28 volunteer sees only volunteer pages; a page opens on tap', async () => {
    mockMembership = { role: 'volunteer', partyName: 'JVP', features: { poll: true, tasks: true, surnames: true } };
    const onClose = jest.fn();
    await render(wrap(<SideMenu open onClose={onClose} />));
    expect(screen.getByLabelText('Voters')).toBeTruthy();
    expect(screen.queryByLabelText('Win plan')).toBeNull();
    expect(screen.queryByLabelText('Map & Trend')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Voters'));
    expect(onClose).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/voters');
  });

  it('TC-MT-28b admin sees win and analysis pages; switched-off features are hidden', async () => {
    mockMembership = { role: 'admin', partyName: 'JVP', features: { tasks: false } };
    await render(wrap(<SideMenu open onClose={jest.fn()} />));
    expect(screen.getByLabelText('Win plan')).toBeTruthy();
    expect(screen.getByLabelText('Map & Trend')).toBeTruthy();
    expect(screen.queryByLabelText('Voters')).toBeNull();
    expect(screen.queryByLabelText('Tasks')).toBeNull();
  });
});

describe('picture tips', () => {
  it('TC-MT-24 shows once; Skip hides it for good', async () => {
    await act(() => usePrefs.setState({ hydrated: true, tipsSeen: false }));
    const { unmount } = await render(wrap(<Tips />));
    expect(screen.getByText('Tap Go to a house')).toBeTruthy();
    await fireEvent.press(screen.getByText('Next'));
    expect(screen.getByText('Tap one colour')).toBeTruthy();
    await fireEvent.press(screen.getByText('Skip'));
    expect(usePrefs.getState().tipsSeen).toBe(true);
    await unmount();
    await render(wrap(<Tips />));
    expect(screen.queryByText('Tap Go to a house')).toBeNull();
  });
});
