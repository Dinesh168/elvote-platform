import { useEffect, type ReactNode } from 'react';
import { useWide } from '../layout';
import { web } from '../tokens';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing } from '../tokens';
import { AppText } from './AppText';
import { Group, Row } from './Group';
import { Icon } from './Icon';

/** iOS sheet: grabber, centred title, Done. */
export function Sheet({ visible, title, onClose, children, footer }: { visible: boolean; title: string; onClose: () => void; children: ReactNode; footer?: string }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const wide = useWide();
  useEffect(() => {
    if (!wide || !visible || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [wide, visible, onClose]);
  // react-native-web's Modal wraps the content in its own role="dialog" with no name (axe: aria-dialog-name): give it ours.
  useEffect(() => {
    if (!visible || typeof document === 'undefined') return;
    // The Modal mounts its content after the open animation starts, so try a few times.
    const name = () => document.querySelectorAll('[role="dialog"]:not([aria-label])').forEach((el) => el.setAttribute('aria-label', title));
    const ids = [0, 100, 300, 800].map((ms) => setTimeout(name, ms));
    return () => ids.forEach(clearTimeout);
  }, [visible, title]);
  if (wide)
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={s.center}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={t('common.done')} onPress={onClose} />
          <View style={s.dialog} accessibilityViewIsModal aria-modal role="dialog" aria-label={title}>
            <View style={s.dHead}>
              <AppText variant="title2" accessibilityRole="header">{title}</AppText>
              <Pressable accessibilityRole="button" accessibilityLabel={t('common.done')} onPress={onClose} style={s.close}>
                <Icon name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Group style={{ marginTop: 0 }} footer={footer}>
              {children}
            </Group>
          </View>
        </View>
      </Modal>
    );
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {/* spec states-keyboard V1: a sheet with a text box moves up with the keyboard. */}
      <KeyboardAvoidingView behavior="padding" enabled={Platform.OS !== 'web'} style={s.overlay}>
        <Pressable style={s.flex} accessibilityRole="button" accessibilityLabel={t('common.done')} onPress={onClose} />
        <View style={[s.sheet, { paddingBottom: insets.bottom + spacing.xxl }]} accessibilityViewIsModal>
          <View style={s.grabber} />
          <View style={s.head}>
            <AppText variant="headline" accessibilityRole="header">
              {title}
            </AppText>
            <Pressable accessibilityRole="button" onPress={onClose} style={s.done} hitSlop={8}>
              <AppText variant="headline" color={colors.accent}>
                {t('common.done')}
              </AppText>
            </Pressable>
          </View>
          <Group style={{ marginTop: 0 }} footer={footer}>
            {children}
          </Group>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** A selectable sheet row with an indigo ✓ on the chosen one. */
export function ChoiceRow({ title, subtitle, selected, onPress, last }: { title: string; subtitle?: string; selected: boolean; onPress: () => void; last?: boolean }) {
  return (
    <Row
      title={title}
      subtitle={subtitle}
      onPress={onPress}
      last={last}
      a11yLabel={[title, subtitle, selected ? '✓' : ''].filter(Boolean).join(', ')}
      trailing={selected ? <Icon name="checkmark" size={22} color={colors.accent} /> : null}
    />
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  dialog: { width: '100%', maxWidth: 480, maxHeight: '85%', backgroundColor: colors.bg, borderRadius: radius.lg + 4, paddingBottom: spacing.lg, borderWidth: 1, borderColor: web.border, overflow: 'hidden' },
  dHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.fill },
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  flex: { flex: 1 },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingTop: 6 },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: colors.grabber },
  head: { height: 52, alignItems: 'center', justifyContent: 'center' },
  done: { position: 'absolute', right: spacing.lg, height: 44, justifyContent: 'center' },
});
