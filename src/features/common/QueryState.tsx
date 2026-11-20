import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Button } from '@/design/components';
import { colors, spacing } from '@/design/tokens';

/** Loading and error states for a query (never a blank screen). */
export function QueryState({ loading, error, onRetry }: { loading: boolean; error: boolean; onRetry: () => void }) {
  const { t } = useTranslation();
  if (loading)
    return (
      <View style={s.box} accessibilityRole="progressbar" accessibilityLabel={t('common.loading')}>
        <ActivityIndicator color={colors.textSecondary} />
        <AppText variant="callout" color={colors.textSecondary}>
          {t('common.loading')}
        </AppText>
      </View>
    );
  if (error)
    return (
      <View style={s.box}>
        <AppText variant="body" align="center">
          {t('common.loadError')}
        </AppText>
        <Button label={t('common.retry')} kind="tinted" onPress={onRetry} compact />
      </View>
    );
  return null;
}

const s = StyleSheet.create({ box: { padding: spacing.xxxl, alignItems: 'center', gap: spacing.md } });
