/**
 * Keyboard "Done" (spec usability-r2 U3). Number and phone keypads have no return key on iPhone, so every such field
 * gets a bar above the keypad with Done. Android keypads show their own ✓ key (returnKeyType "done").
 * `DoneBarHost` is rendered once at the app root; fields spread `doneProps(keyboardType)`.
 */
import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, View, type KeyboardTypeOptions, type TextInputProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, hairline, spacing } from '../tokens';
import { AppText } from './AppText';

export const DONE_BAR_ID = 'elvote-done';

const KEYPADS = new Set<KeyboardTypeOptions | undefined>(['number-pad', 'decimal-pad', 'numeric', 'phone-pad']);

/** Extra TextInput props for number/phone fields: Done bar (iOS), ✓ key (Android), closes the keyboard. */
export function doneProps(keyboardType?: KeyboardTypeOptions): Partial<TextInputProps> {
  if (!KEYPADS.has(keyboardType)) return {};
  return {
    returnKeyType: 'done',
    onSubmitEditing: () => Keyboard.dismiss(),
    ...(Platform.OS === 'ios' ? { inputAccessoryViewID: DONE_BAR_ID } : {}),
  };
}

export function DoneBarHost() {
  const { t } = useTranslation();
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={DONE_BAR_ID}>
      <View style={s.bar}>
        <Pressable accessibilityRole="button" onPress={() => Keyboard.dismiss()} hitSlop={8} style={s.done}>
          <AppText variant="body" weight="semibold" color={colors.accent}>{t('common.done')}</AppText>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const s = StyleSheet.create({
  bar: { height: 44, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: spacing.lg, backgroundColor: colors.keyboardBar, borderTopWidth: hairline, borderTopColor: colors.separator },
  done: { minHeight: 44, justifyContent: 'center' },
});
