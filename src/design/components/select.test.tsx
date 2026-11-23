import { fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { useStateChoice } from '@/features/common/useStateChoice';
import { usePrefs } from '@/stores/prefs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Select } from './Select';

const M = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const wrap = (el: React.ReactElement) => <SafeAreaProvider initialMetrics={M}>{el}</SafeAreaProvider>;

const OPTS = [{ value: 'PB', label: 'Punjab' }, { value: 'UP', label: 'Uttar Pradesh' }, { value: 'HR', label: 'Haryana' }];

/** spec states-keyboard A1/A2 (TC-SK-2..4). */
describe('Select', () => {
  it('opens the list and picks an option', async () => {
    const onChange = jest.fn();
    await render(wrap(<Select label="State" value="PB" options={OPTS} onChange={onChange} />));
    await fireEvent.press(screen.getByRole('button', { name: 'State, Punjab' }));
    expect(screen.getByLabelText('Punjab, ✓')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Uttar Pradesh'));
    expect(onChange).toHaveBeenCalledWith('UP');
  });

  it('with one option only shows it', async () => {
    await render(wrap(<Select label="State" value="PB" options={OPTS.slice(0, 1)} onChange={jest.fn()} />));
    expect(screen.getByText('Punjab')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /State/ })).toBeNull();
  });
});

describe('useStateChoice', () => {
  it('starts on the last picked state when offered, else the first', async () => {
    usePrefs.setState({ lastState: 'UP' });
    expect((await renderHook(() => useStateChoice(['PB', 'UP']))).result.current[0]).toBe('UP');
    expect((await renderHook(() => useStateChoice(['PB']))).result.current[0]).toBe('PB');
  });
});
