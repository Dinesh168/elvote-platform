import { createElement } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { colors, radius } from '@/design/tokens';

/**
 * C1: pick any colour. On the web this is the browser's own colour picker (spectrum + eyedropper in Chrome/Edge);
 * the hex field next to it stays in sync. Phones use the swatches and the hex field.
 */
export function ColourPicker({ value, onChange, label }: { value: string | null; onChange: (hex: string) => void; label: string }) {
  const ok = !!value && /^#[0-9A-Fa-f]{6}$/.test(value);
  if (Platform.OS !== 'web') return <View style={[s.chip, { backgroundColor: ok ? value! : colors.fill }]} accessibilityLabel={label} />;
  return (
    <View style={[s.chip, { backgroundColor: ok ? value! : colors.fill }]}>
      {createElement('input', {
        type: 'color',
        value: (ok ? value! : colors.accent).toLowerCase(),
        'aria-label': label,
        title: label,
        onChange: (e: { target: { value: string } }) => onChange(e.target.value.toUpperCase()),
        onInput: (e: { target: { value: string } }) => onChange(e.target.value.toUpperCase()),
        style: { position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', border: 'none', padding: 0 },
      })}
    </View>
  );
}

const s = StyleSheet.create({
  chip: { width: 52, height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.separator, overflow: 'hidden', position: 'relative' },
});
