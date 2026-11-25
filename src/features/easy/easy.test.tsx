/** TC-ER-UI1 … TC-ER-UI3 (docs/test-cases/easy-redesign.md). */
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Voter } from '@/api/types';
import { ActivePills, FilterSheet } from '@/design/components';
import { group } from '@/design/tokens';
import { VoterRow } from '@/features/voters/VoterRow';

const v: Voter = {
  id: 'v1', booth: 112, sno: 239, name: 'Manpreet Kaur', relation: 'W/o', relative: 'Balwinder Singh', age: 41, gender: 'F',
  house: '12', ward: '1', village: 'Gandhi Nagar', epic: 'PBX2034813', residence: 'here', needsHelp: false, group: 'our',
};
const noop = () => undefined;
const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const wrap = (ui: ReactElement) => <SafeAreaProvider initialMetrics={METRICS}>{ui}</SafeAreaProvider>;

describe('voter card (V1)', () => {
  it('TC-ER-UI1 an "our" voter: whole card in the our tint; EPIC, relative and house shown; badge word', async () => {
    await render(<VoterRow voter={v} open={false} onToggle={noop} onGroup={noop} onPatch={noop} />);
    expect(screen.getByText('EPIC PBX2034813')).toBeTruthy();
    expect(screen.getByText(/Balwinder Singh/)).toBeTruthy();
    expect(screen.getByText(/12/)).toBeTruthy();
    const btn = screen.getByRole('button', { name: /Manpreet Kaur/ });
    // The card is the button's parent view; its background is the group's card tint.
    type N = { props: { style?: unknown }; parent: N | null };
    let node: N | null = btn as unknown as N;
    let bg: string | undefined;
    for (let i = 0; i < 6 && node && !bg; i++) {
      const style = StyleSheet.flatten(node.props.style as never) as { backgroundColor?: string } | undefined;
      bg = style?.backgroundColor === group.our.card ? style.backgroundColor : undefined;
      node = node.parent;
    }
    expect(bg).toBe(group.our.card);
  });

  it('TC-ER-UI2 open card: tap Swing → onGroup(voter, "target")', async () => {
    const onGroup = jest.fn();
    await render(wrap(<VoterRow voter={{ ...v, group: undefined }} open onToggle={noop} onGroup={onGroup} onPatch={noop} />));
    expect(screen.getByText(/Now marking/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: 'Swing' }));
    expect(onGroup).toHaveBeenCalledWith(expect.objectContaining({ id: 'v1' }), 'target');
  });
});

describe('list tools (V3)', () => {
  it('TC-ER-UI3 filter sheet option and removable pills', async () => {
    const pick = jest.fn();
    const clear = jest.fn();
    const remove = jest.fn();
    await render(wrap(
      <>
        <FilterSheet visible onClose={noop} onClear={clear} showLabel="Show 3"
          cats={[{ title: 'Phone number', icon: 'call', opts: [{ key: 'with', label: 'With phone', count: 3, selected: false, onPress: pick }] }]} />
        <ActivePills pills={[{ label: 'With phone', onRemove: remove }]} onClear={clear} />
      </>,
    ));
    await fireEvent.press(screen.getByRole('checkbox', { name: /With phone/ }));
    expect(pick).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Remove With phone' }));
    expect(remove).toHaveBeenCalled();
    await fireEvent.press(screen.getAllByText('Clear all')[0]);
    expect(clear).toHaveBeenCalled();
  });
});
