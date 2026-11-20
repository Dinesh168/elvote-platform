import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import type { GroupCode } from '@/api/types';
import { colors, group, radius, touch } from '../tokens';
import { AppText } from './AppText';

export interface GroupPickerProps {
  value?: GroupCode;
  labels: Record<GroupCode, string>;
  voterName: string;
  onPick: (g: GroupCode) => void;
}

const ORDER: GroupCode[] = ['our', 'target', 'opp'];

/** Three readable group buttons. Selected = solid colour, white text and ✓ (owner rule). */
export function GroupPicker({ value, labels, voterName, onPick }: GroupPickerProps) {
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
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onPick(g);
            }}
            style={({ pressed }) => [s.btn, { borderColor: tone.strong, backgroundColor: on ? tone.strong : tone.tint }, pressed && { opacity: 0.8 }]}
          >
            <AppText variant="headline" weight="bold" color={on ? colors.textOnAccent : tone.strong} numberOfLines={1} style={s.label}>
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
  btn: { flex: 1, height: touch.group, borderRadius: radius.lg, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  label: { fontSize: 16, letterSpacing: -0.3 },
});
