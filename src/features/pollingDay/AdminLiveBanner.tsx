/** Phone admins: while polling day is live, a strip above every screen shows who is away and opens the polling-day page. */
import { useQuery } from '@tanstack/react-query';
import { router, usePathname } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/api/adminApi';
import { AppText, Icon } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, spacing } from '@/design/tokens';
import { useAdminPolling } from './adminHooks';

export function AdminLiveBanner({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const path = usePathname();
  const { mid, live, unseen } = useAdminPolling();
  const q = useQuery({ queryKey: ['polling', mid], queryFn: () => adminApi.polling(mid), enabled: !!mid && live, refetchInterval: live ? 30_000 : false });
  const show = live && path !== '/admin/polling';
  const away = q.data?.tiles.away ?? 0;
  const bad = away > 0 || unseen > 0;
  return (
    <View style={s.fill}>
      {show ? (
        <SafeAreaView edges={['top']} style={{ backgroundColor: bad ? colors.danger : colors.success }}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/admin/polling')} style={s.row}
            accessibilityLabel={`${t('pd.liveNow')}. ${t('pd.bannerAway', { n: away })}. ${unseen ? t('pd.newAlerts', { n: unseen }) : ''}`}>
            <Icon name={bad ? 'warning' : 'location'} size={20} color={colors.textOnAccent} />
            <AppText variant="callout" weight="semibold" color={colors.textOnAccent} style={s.fill} numberOfLines={1}>
              {`${t('pd.liveNow')} · ${t('pd.bannerAway', { n: away })}${unseen ? ` · ${t('pd.newAlerts', { n: unseen })}` : ''}`}
            </AppText>
            <Icon name="chevron-forward" size={18} color={colors.textOnAccent} />
          </Pressable>
        </SafeAreaView>
      ) : null}
      <View style={s.fill}>{children}</View>
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 48 },
}));
