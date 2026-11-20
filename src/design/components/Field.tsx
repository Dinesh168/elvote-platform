import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts, radius, spacing } from '../tokens';
import { AppText } from './AppText';

/** Labelled text field (iOS grouped style). Shows an error line under the box. */
export function Field({ label, error, hint, prefix, style, ...rest }: TextInputProps & { label: string; error?: string | null; hint?: string; prefix?: string }) {
  return (
    <View style={s.wrap}>
      <AppText variant="footnote" color={colors.textSecondary} style={s.label}>{label}</AppText>
      <View style={[s.box, error ? s.bad : null]}>
        {prefix ? <AppText variant="body" color={colors.textSecondary}>{prefix}</AppText> : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textTertiary}
          style={[s.input, style]}
          {...rest}
        />
      </View>
      {error ? <AppText variant="footnote" color={colors.danger}>{error}</AppText> : hint ? <AppText variant="footnote" color={colors.textSecondary}>{hint}</AppText> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 6 },
  label: { paddingHorizontal: 4 },
  box: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 50, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.separator },
  bad: { borderColor: colors.danger },
  input: { flex: 1, fontSize: 17, fontFamily: fonts.regular, color: colors.text, paddingVertical: 10 },
});
