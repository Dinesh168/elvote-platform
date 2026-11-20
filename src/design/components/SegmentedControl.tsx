import * as Haptics from 'expo-haptics';
import { themed } from '../theme';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useWide } from '../layout';
import { colors, radius } from '../tokens';
import { AppText } from './AppText';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  /** `view`: white thumb (switching views). `answer`: indigo fill + ✓ (saving an answer). */
  variant?: 'view' | 'answer';
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl<T extends string>({ options, value, onChange, variant = 'view', label, style }: SegmentedControlProps<T>) {
  const answer = variant === 'answer';
  const wide = useWide();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[s.track, wide && !answer && { alignSelf: 'flex-start', width: '100%', maxWidth: 160 * options.length }, style]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: on, checked: on }}
            aria-checked={on}
            onPress={() => {
              if (on) return;
              Haptics.selectionAsync();
              onChange(o.value);
            }}
            style={[s.seg, answer ? s.segAnswer : s.segView, on && (answer ? s.onAnswer : s.onView)]}
          >
            <AppText variant="callout" weight="semibold" color={on && answer ? colors.textOnAccent : answer ? colors.text : colors.text} numberOfLines={1}>
              {on && answer ? `✓ ${o.label}` : o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const shadow = { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 };

const s = themed(() => StyleSheet.create({
  track: { flexDirection: 'row', padding: 2, gap: 2, borderRadius: 9, backgroundColor: colors.fill },
  seg: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, paddingHorizontal: 6 },
  segView: { height: 32 },
  segAnswer: { height: 40 },
  onView: { backgroundColor: colors.surface, ...shadow },
  onAnswer: { backgroundColor: colors.accent, ...shadow },
}));
