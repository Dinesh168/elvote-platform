/**
 * iOS-style alert (spec usability-r2 U1): title, message and 2–3 buttons, the destructive one in red. Used instead of
 * "tap again to confirm". Works the same on Android, iOS and the website (RN's Alert does nothing on web).
 */
import { useEffect } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { themed } from '../theme';
import { colors, hairline, spacing } from '../tokens';
import { AppText } from './AppText';

export type DialogAction = { label: string; onPress: () => void; style?: 'cancel' | 'destructive' | 'default'; testID?: string };

export function ConfirmDialog({ visible, title, message, actions, onDismiss }: {
  visible: boolean; title: string; message?: string; actions: DialogAction[]; onDismiss: () => void;
}) {
  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onDismiss();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onDismiss]);
  const row = actions.length === 2;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.box} role="alertdialog" aria-modal aria-label={title} accessibilityViewIsModal>
          <View style={s.text}>
            <AppText variant="headline" align="center" accessibilityRole="header">{title}</AppText>
            {message ? <AppText variant="footnote" align="center" style={s.msg}>{message}</AppText> : null}
          </View>
          <View style={[s.actions, row && s.row]}>
            {actions.map((a, i) => (
              <Pressable key={a.label} accessibilityRole="button" testID={a.testID} onPress={a.onPress}
                style={({ pressed }) => [s.btn, row ? i > 0 && s.btnLeft : s.btnTop, pressed && { backgroundColor: colors.pressed }]}>
                <AppText variant="body" weight={a.style === 'cancel' ? 'regular' : 'semibold'} color={a.style === 'destructive' ? colors.danger : colors.accent} align="center">{a.label}</AppText>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = themed(() => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  box: { width: 290, maxWidth: '100%', borderRadius: 14, backgroundColor: colors.surface, overflow: 'hidden' },
  text: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md, gap: 4 },
  msg: { color: colors.text, lineHeight: 19 },
  actions: { borderTopWidth: hairline, borderTopColor: colors.separator },
  row: { flexDirection: 'row' },
  btn: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  btnLeft: { borderLeftWidth: hairline, borderLeftColor: colors.separator },
  btnTop: { borderTopWidth: hairline, borderTopColor: colors.separator, flex: 0 },
}));
