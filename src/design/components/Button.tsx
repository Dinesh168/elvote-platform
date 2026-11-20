import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useWide } from '../layout';
import { colors, radius, touch, web } from '../tokens';
import { AppText } from './AppText';

export type ButtonKind = 'filled' | 'tinted' | 'plain' | 'success' | 'danger';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  kind?: ButtonKind;
  disabled?: boolean;
  icon?: ReactNode;
  a11yLabel?: string;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  /** Full width on the web desktop too (sign-in forms). Phones are always full width. */
  block?: boolean;
}

// Functions (not constants) so the customer's party colour applies after sign-in.
const BG = (): Record<ButtonKind, string> => ({ filled: colors.accent, tinted: colors.accentTint, plain: 'transparent', success: colors.success, danger: colors.danger });
const FG = (): Record<ButtonKind, string> => ({ filled: colors.textOnAccent, tinted: colors.accent, plain: colors.accent, success: colors.textOnAccent, danger: colors.textOnAccent });

/** iOS-style button: filled for the one primary action, tinted for secondary, plain for links. */
export function Button({ label, onPress, kind = 'filled', disabled, icon, a11yLabel, style, compact, block }: ButtonProps) {
  const wide = useWide();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        Haptics.selectionAsync();
        onPress?.();
      }}
      style={(st) => {
        const hovered = (st as { hovered?: boolean }).hovered && !disabled;
        return [
          s.base,
          { minHeight: compact ? touch.min : touch.primary, paddingVertical: compact ? 4 : 0, backgroundColor: disabled && kind !== 'plain' ? colors.keypadDisabled : BG()[kind] },
          kind === 'tinted' && { borderRadius: radius.md },
          wide && s.wide,
          wide && block && { alignSelf: 'stretch' as const, minHeight: 44 },
          wide && compact && { minHeight: 36 },
          hovered && kind === 'filled' && { backgroundColor: web.buttonHover },
          hovered && kind !== 'filled' && { opacity: 0.8 },
          st.pressed && !disabled && { opacity: 0.75 },
          style,
        ];
      }}
    >
      {icon}
      <AppText
        variant={compact ? 'callout' : 'headline'}
        weight="semibold"
        align="center"
        color={disabled && kind === 'plain' ? colors.textTertiary : FG()[kind]}
        numberOfLines={compact ? 2 : 1}
        style={compact ? { lineHeight: 18 } : undefined}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wide: { alignSelf: 'flex-start', minHeight: 40, paddingHorizontal: 20, borderRadius: radius.md },
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.lg, paddingHorizontal: 12 },
});
