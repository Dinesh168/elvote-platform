import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import type { GroupCode } from '@/api/types';
import { colors, group, radius, touch } from '../tokens';
import { AppText } from './AppText';
import { Icon } from './Icon';

/** Icon + word (owner decision): thumbs up = ours, target = maybe, thumbs down = other. */
const GROUP_ICON: Record<GroupCode, string> = { our: 'thumbs-up', target: 'locate', opp: 'thumbs-down' };

export interface GroupPickerProps {
  value?: GroupCode;
  labels: Record<GroupCode, string>;
  voterName: string;
  onPick: (g: GroupCode) => void;
  /** Icon and word side by side, 48 px tall (voter card). */
  compact?: boolean;
}

const ORDER: GroupCode[] = ['our', 'target', 'opp'];

/** Three readable group buttons. Selected = solid colour, white text and ✓ (owner rule). */
export function GroupPicker({ value, labels, voterName, onPick, compact }: GroupPickerProps) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={voterName} style={s.row}>
      {ORDER.map((g) => {
        const on = value === g;
        const tone = group[g];
        return (
          <Pressable
            key={g}
            accessibilityRole="radio"
            accessibilityLabel={labels[g]}
            accessibilityState={{ selected: on, checked: on }}
            aria-checked={on}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onPick(g);
            }}
            style={({ pressed }) => [s.btn, compact && s.compact, { borderColor: tone.strong, backgroundColor: on ? tone.strong : tone.tint }, pressed && { opacity: 0.8 }]}
          >
            <Icon name={GROUP_ICON[g]} size={compact ? 17 : 26} color={on ? colors.textOnAccent : tone.strong} />
            <AppText variant="headline" weight="bold" color={on ? colors.textOnAccent : tone.strong} numberOfLines={1} style={[s.label, compact && s.compactLabel]}>
              {on ? `✓ ${labels[g]}` : labels[g]}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, minHeight: touch.group + 28, borderRadius: radius.lg, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, paddingVertical: 8, gap: 4 },
  label: { fontSize: 16, letterSpacing: -0.3 },
  compact: { minHeight: 48, flexDirection: 'row', gap: 4, paddingVertical: 4 },
  compactLabel: { fontSize: 14, letterSpacing: -0.4 },
});
