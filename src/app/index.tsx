import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { API_MODE } from '@/api/client';
import { ApiError } from '@/api/http';
import { AppText, Button } from '@/design/components';
import { colors, spacing } from '@/design/tokens';
import { goLanding } from '@/features/session/session';
import { useSession } from '@/stores/session';

/** Start screen: restores the session and sends the user to the right place for their role. */
export default function Index() {
  const { t } = useTranslation();
  const loaded = useSession((s) => s.loaded);
  const refresh = useSession((s) => !!s.refreshToken);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { next } = useLocalSearchParams<{ next?: string }>();

  useEffect(() => {
    if (API_MODE === 'mock') return;
    if (!loaded) void useSession.getState().load();
  }, [loaded]);

  useEffect(() => {
    if (API_MODE === 'mock' || !loaded || !refresh) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clear the previous error before a new sign-in attempt
    setError(null);
    goLanding(typeof next === 'string' ? next : undefined).catch((e: unknown) => setError(e instanceof ApiError && e.code === 'network' ? t('auth.network') : (e as Error).message));
  }, [loaded, refresh, attempt, t, next]);

  if (API_MODE === 'mock') return <Redirect href="/home" />;
  if (loaded && !refresh) return <Redirect href="/login" />;
  return (
    <View style={s.root}>
      {error ? (
        <>
          <AppText variant="body" align="center">{error}</AppText>
          <Button label={t('common.retry')} onPress={() => setAttempt((a) => a + 1)} style={s.btn} />
        </>
      ) : (
        <ActivityIndicator color={colors.accent} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.lg, backgroundColor: colors.bg },
  btn: { alignSelf: 'stretch' },
});
