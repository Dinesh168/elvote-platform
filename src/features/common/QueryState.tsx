import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { ApiError } from '@/api/http';
import { AppText, Button } from '@/design/components';
import { colors, spacing } from '@/design/tokens';

/**
 * spec admin-fixes-r1 O2: say "No internet" only when the server could not be reached; a server refusal shows its code
 * (the old text blamed the internet for every failure).
 */
export function loadErrorText(t: TFunction, err: unknown): string {
  if (err instanceof ApiError && err.status > 0) return t('common.loadErrorCode', { code: err.status });
  if (err instanceof ApiError || err instanceof TypeError) return t('common.noInternet');
  return t('common.loadError');
}

/** Loading and error states for a query (never a blank screen). */
export function QueryState({ loading, error, err, onRetry }: { loading: boolean; error: boolean; err?: unknown; onRetry: () => void }) {
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
          {loadErrorText(t, err)}
        </AppText>
        <Button label={t('common.retry')} kind="tinted" onPress={onRetry} compact />
      </View>
    );
  return null;
}

const s = StyleSheet.create({ box: { padding: spacing.xxxl, alignItems: 'center', gap: spacing.md } });
