/**
 * Picture tips on first use (spec map-trend G3): three big pictures over a dim layer — meet the next voter, tap one
 * colour, the cloud sends it. Skip or Next; shown once per phone (prefs.tipsSeen).
 */
import { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Button, Icon } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, group, radius, spacing } from '@/design/tokens';
import { usePrefs } from '@/stores/prefs';

const STEPS = [
  { key: 'meet', icon: 'hand-left', color: colors.success, tint: colors.successTint },
  { key: 'colour', icon: 'color-palette', color: group.our.strong, tint: group.our.tint },
  { key: 'sync', icon: 'cloud-done', color: colors.accent, tint: colors.accentTint },
] as const;

export function Tips() {
  const { t } = useTranslation();
  const seen = usePrefs((s) => s.tipsSeen);
  const hydrated = usePrefs((s) => s.hydrated);
  const done = usePrefs((s) => s.seeTips);
  const [i, setI] = useState(0);
  if (!hydrated || seen) return null;
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  return (
    <Modal transparent animationType="fade" visible onRequestClose={done}>
      <View style={s.dim}>
        <View style={s.card} accessibilityViewIsModal accessibilityLabel={t('tips.label')}>
          <View style={[s.pic, { backgroundColor: step.tint }]}>
            <Icon name={step.icon} size={56} color={step.color} />
          </View>
          <AppText variant="title2" align="center">{t(`tips.${step.key}.title`)}</AppText>
          <AppText variant="body" align="center" color={colors.textSecondary}>{t(`tips.${step.key}.text`)}</AppText>
          <View style={s.dots} accessible accessibilityLabel={t('tips.step', { n: i + 1, of: STEPS.length })}>
            {STEPS.map((x, k) => <View key={x.key} style={[s.dot, k === i && s.dotOn]} />)}
          </View>
          <View style={s.actions}>
            {!last ? <Button kind="plain" label={t('tips.skip')} onPress={done} style={s.flex} /> : null}
            <Button label={last ? t('tips.start') : t('tips.next')} onPress={() => (last ? done() : setI(i + 1))} style={s.flex} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = themed(() => StyleSheet.create({
  dim: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'center', padding: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg * 2, padding: spacing.xxl, gap: spacing.md, alignItems: 'center', maxWidth: 420, alignSelf: 'center', width: '100%' },
  pic: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  dots: { flexDirection: 'row', gap: 6, marginTop: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.chevron },
  dotOn: { width: 22, backgroundColor: colors.accent },
  actions: { flexDirection: 'row', gap: spacing.md, alignSelf: 'stretch', marginTop: spacing.sm },
  flex: { flex: 1 },
}));
