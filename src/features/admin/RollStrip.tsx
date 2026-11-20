/** spec bilingual-roll U9: "Roll: Final · 25 Nov 2026 · 2 new · Not in the latest roll (2)" under the admin dashboard title. */
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/api/adminApi';
import { AppText, Icon } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, spacing } from '@/design/tokens';
import { localeOf } from '@/i18n';

export function useRoll(mid: string) {
  return useQuery({ queryKey: ['roll', mid], queryFn: () => adminApi.roll(mid), enabled: !!mid, staleTime: 5 * 60_000 });
}

export function rollLine(t: TFunction, lang: string, kind: string | null, publishedOn: string | null) {
  if (!kind) return null;
  const k = t(`roll.kind.${kind}`);
  if (!publishedOn) return t('roll.lineNoDate', { kind: k });
  const date = new Date(`${publishedOn}T12:00:00Z`).toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return t('roll.line', { kind: k, date });
}

export function RollStrip({ mid }: { mid: string }) {
  const { t, i18n } = useTranslation();
  const q = useRoll(mid);
  const r = q.data;
  const line = r ? rollLine(t, i18n.language, r.kind, r.publishedOn) : null;
  if (!r || !line) return null;
  const extra = [r.newCount ? t('roll.newCount', { n: r.newCount }) : null].filter(Boolean).join(' · ');
  return (
    <View style={s.wrap}>
      <AppText variant="footnote" color={colors.textSecondary}>{extra ? `${line} · ${extra}` : line}</AppText>
      {r.notInRoll ? (
        <Pressable accessibilityRole="link" onPress={() => router.push('/admin/roll')} style={s.link} hitSlop={8}>
          <AppText variant="footnote" weight="semibold" color={colors.accent}>{t('roll.notInRoll', { n: r.notInRoll })}</AppText>
          <Icon name="chevron-forward" size={14} color={colors.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.md, rowGap: 4, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 24 },
}));
