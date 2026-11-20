import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useWide } from '../layout';
import { colors, radius, spacing } from '../tokens';
import { AppText } from './AppText';
import { Icon } from './Icon';

/** Dark floating capsule above the tab bar with Undo; hides after 5 s. */
export function Toast({ message, onUndo, onHide }: { message: string | null; onUndo?: () => void; onHide: () => void }) {
  const { t } = useTranslation();
  const wide = useWide();
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onHide, 5000);
    return () => clearTimeout(id);
  }, [message, onHide]);
  if (!message) return null;
  return (
    <View style={[s.wrap, wide && s.wrapWide]} pointerEvents="box-none">
      <View style={s.toast} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <Icon name="checkmark" size={20} color={colors.toastSuccess} />
        <AppText variant="callout" color={colors.textOnAccent} style={s.msg} numberOfLines={2}>
          {message}
        </AppText>
        {onUndo ? (
          <Pressable accessibilityRole="button" onPress={onUndo} style={s.undo}>
            <AppText variant="callout" weight="semibold" color={colors.toastAction}>
              {t('common.undo')}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.md },
  wrapWide: { left: undefined, right: spacing.xxl, bottom: spacing.xxl, width: 420 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: spacing.lg, paddingRight: 4, minHeight: 52, borderRadius: radius.lg + 2, backgroundColor: colors.toast,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  msg: { flex: 1 },
  undo: { height: 44, paddingHorizontal: 14, justifyContent: 'center' },
});
