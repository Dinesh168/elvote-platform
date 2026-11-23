import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, fonts, radius, spacing } from '../tokens';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { ChoiceRow, Sheet } from './Sheet';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  /** One line under the option (e.g. who a position is for). */
  subtitle?: string;
}

/**
 * spec states-keyboard A1: labelled dropdown field: shows the chosen option and ▾; tap → sheet with ✓ on the chosen one.
 * With a single option it only shows it. spec admin-request-form A1: `searchable` adds a search box; the list scrolls.
 */
export function Select<T extends string>({ label, value, options, onChange, placeholder, searchable }: {
  label: string; value: T | null; options: SelectOption<T>[]; onChange: (v: T) => void; placeholder?: string; searchable?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const current = options.find((o) => o.value === value);
  const text = current?.label ?? placeholder ?? '';
  const single = options.length <= 1;
  const needle = q.trim().toLowerCase();
  const shown = needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options;
  const close = () => { setOpen(false); setQ(''); };
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
      <Sheet visible={open} title={label} onClose={close}>
        {searchable ? (
          <View style={s.search}>
            <Icon name="search" size={18} color={colors.textSecondary} />
            <TextInput accessibilityLabel={t('common.search')} placeholder={t('common.search')} placeholderTextColor={colors.textTertiary}
              value={q} onChangeText={setQ} style={s.input} autoCorrect={false} />
          </View>
        ) : null}
        <ScrollView style={s.list} keyboardShouldPersistTaps="handled">
          {shown.map((o, i) => (
            <ChoiceRow key={o.value} title={o.label} subtitle={o.subtitle} selected={o.value === value} last={i === shown.length - 1}
              onPress={() => { close(); if (o.value !== value) onChange(o.value); }} />
          ))}
        </ScrollView>
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 6 },
  label: { paddingHorizontal: 4 },
  box: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 50, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.separator },
  flex: { flex: 1 },
  list: { maxHeight: 420 },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, margin: spacing.md, paddingHorizontal: spacing.md, minHeight: 44, borderRadius: radius.md, backgroundColor: colors.fill },
  input: { flex: 1, fontSize: 17, fontFamily: fonts.regular, color: colors.text, paddingVertical: 8 },
});
