import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from './Button';
import { GroupPicker } from './GroupPicker';
import { Row } from './Row';
import { SegmentedControl } from './SegmentedControl';

describe('Button', () => {
  it('has role, label and fires onPress', async () => {
    const onPress = jest.fn();
    await render(<Button label="Start meeting" onPress={onPress} />);
    const b = screen.getByRole('button', { name: 'Start meeting' });
    await fireEvent.press(b);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('SegmentedControl answer variant (owner rule: active is obvious)', () => {
  it('marks the selected option with ✓ and selected state', async () => {
    const onChange = jest.fn();
    await render(
      <SegmentedControl
        variant="answer"
        label="Lives here?"
        value="here"
        options={[
          { value: 'here', label: 'Yes' },
          { value: 'moved', label: 'Moved' },
        ]}
        onChange={onChange}
      />,
    );
    expect(screen.getByText('✓ Yes')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Yes' }).props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(screen.getByRole('radio', { name: 'Moved' }));
    expect(onChange).toHaveBeenCalledWith('moved');
  });
});

describe('GroupPicker (TC-V3-13)', () => {
  it('shows three radios, ✓ on the selected, calls onPick', async () => {
    const onPick = jest.fn();
    await render(
      <GroupPicker
        value="our"
        labels={{ our: 'Our', target: 'Target', opp: 'Opposition' }}
        voterName="Sunita Devi"
        onPick={onPick}
      />,
    );
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByText('✓ Our')).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: 'Target' }));
    expect(onPick).toHaveBeenCalledWith('target');
  });
});

describe('Row', () => {
  it('is a button with title and value in its label', async () => {
    const onPress = jest.fn();
    await render(<Row title="Mobile numbers" value="486" onPress={onPress} chevron />);
    await fireEvent.press(screen.getByRole('button', { name: 'Mobile numbers, 486' }));
    expect(onPress).toHaveBeenCalled();
  });
});
