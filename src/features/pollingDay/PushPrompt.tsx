import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Button, Icon } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, radius, spacing } from '@/design/tokens';
import { registerPush, type PushState } from './push';

/**
 * "Allow notifications" card (spec accounts-access AC11). On the website the browser asks only after a tap;
 * phones ask directly. Hidden once allowed, or where push is not possible.
 */
export function PushPrompt({ reason }: { reason: 'approval' | 'requests' }) {
  const { t } = useTranslation();
  const [state, setState] = useState<PushState | null>(null);
  useEffect(() => {
    void registerPush(false).then(setState);
  }, []);
  if (!state || state === 'granted' || state === 'unsupported') return null;
  return (
    <View style={s.card} accessibilityRole="summary">
      <Icon name="notifications" size={24} color={colors.accent} />
      <View style={s.text}>
        <AppText variant="callout" weight="semibold">{t('push.title')}</AppText>
        <AppText variant="footnote" color={colors.textSecondary}>
          {state === 'denied' ? t('push.blocked') : reason === 'approval' ? t('push.whyApproval') : t('push.whyRequests')}
        </AppText>
        {state === 'ask' ? <Button compact kind="tinted" label={t('push.allow')} onPress={() => void registerPush(true).then(setState)} /> : null}
      </View>
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  card: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.accentTint, alignItems: 'flex-start' },
  text: { flex: 1, gap: spacing.xs, alignItems: 'flex-start' },
}));
