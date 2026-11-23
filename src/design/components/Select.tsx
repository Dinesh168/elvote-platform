import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../tokens';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { ChoiceRow, Sheet } from './Sheet';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

/**
 * spec states-keyboard A1: labelled dropdown field: shows the chosen option and ▾; tap → sheet with ✓ on the chosen one.
 * With a single option it only shows it.
 */
export function Select<T extends string>({ label, value, options, onChange, placeholder }: {
  label: string; value: T | null; options: SelectOption<T>[]; onChange: (v: T) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  const text = current?.label ?? placeholder ?? '';
  const single = options.length <= 1;
  return (
    <View style={s.wrap}>
      <AppText variant="footnote" color={colors.textSecondary} style={s.label}>{label}</AppText>
      {single ? (
        <View style={s.box}><AppText variant="body" style={s.flex}>{options[0]?.label ?? text}</AppText></View>
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${text}`} onPress={() => setOpen(true)} style={s.box}>
          <AppText variant="body" color={current ? colors.text : colors.textTertiary} style={s.flex} numberOfLines={1}>{text}</AppText>
          <Icon name="chevron-down" size={20} color={colors.textSecondary} />
        </Pressable>
      )}
      <Sheet visible={open} title={label} onClose={() => setOpen(false)}>
        {options.map((o, i) => (
          <ChoiceRow key={o.value} title={o.label} selected={o.value === value} last={i === options.length - 1}
            onPress={() => { setOpen(false); if (o.value !== value) onChange(o.value); }} />
        ))}
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 6 },
  label: { paddingHorizontal: 4 },
  box: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 50, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.separator },
  flex: { flex: 1 },
});
