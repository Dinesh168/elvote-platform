/**
 * Volunteer motivation (spec map-trend G1, G2, T6): today's target ring, days in a row, team rank, the last election in
 * the volunteer's own booth, and badges for Profile. Needs the network; when it is not reachable nothing is shown
 * (the meeting flow never depends on it).
 */
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { http } from '@/api/http';
import { AppText, Group, Icon } from '@/design/components';
import { themed } from '@/design/theme';
import { chart, colors, radius, spacing } from '@/design/tokens';
import { Ring } from '@/features/shell/SummaryCard';
import { useActiveMembership } from '@/stores/session';

export interface MyProgress { today: number; target: number; streak: number; week: number; rank: number; teamSize: number; badges: { key: 'met100' | 'met500' | 'phones50' | 'streak5'; earned: boolean; have: number; need: number }[] }
export interface MyBoothResult { year: number; partNo: number; result: 'won' | 'lost'; margin: number }

export function useMyProgress() {
  const m = useActiveMembership();
  return useQuery({ queryKey: ['my-progress', m?.id], queryFn: () => http.get<MyProgress>(`/v1/m/${m!.id}/my-progress`), enabled: !!m, staleTime: 60_000, retry: false });
}

function useMyBoothResult(booth: number) {
  const m = useActiveMembership();
  return useQuery({ queryKey: ['my-booth-result', m?.id, booth], queryFn: () => http.get<MyBoothResult | null>(`/v1/m/${m!.id}/my-booth-result?booth=${booth}`), enabled: !!m && !!booth, staleTime: 3600_000, retry: false });
}

export function ProgressCard({ booth }: { booth: number }) {
  const { t } = useTranslation();
  const p = useMyProgress().data;
  const last = useMyBoothResult(booth).data;
  if (!p) return null;
  const left = Math.max(0, p.target - p.today);
  return (
    <View style={s.card}>
      <View style={s.top} accessible accessibilityLabel={t('prog.a11y', { today: p.today, target: p.target, left })}>
        <Ring pct={(p.today / p.target) * 100} size={64} stroke={7} color={chart.our} label={`${p.today}/${p.target}`} />
        <View style={s.flex}>
          <AppText variant="headline">{left ? t('prog.left', { count: left }) : t('prog.done')}</AppText>
          {last ? (
            <AppText variant="callout" weight="semibold" color={last.result === 'won' ? colors.successText : colors.warning}>
              {t(last.result === 'won' ? 'prog.wonHere' : 'prog.lostHere', { n: last.margin, year: last.year })}
            </AppText>
          ) : null}
        </View>
      </View>
      <View style={s.chips}>
        {p.streak > 0 ? (
          <View style={s.chip} accessible accessibilityLabel={t('prog.streak', { count: p.streak })}>
            <Icon name="flame" size={16} color={colors.warning} />
            <AppText variant="footnote" weight="semibold">{t('prog.streak', { count: p.streak })}</AppText>
          </View>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel={t('prog.rank', { rank: p.rank, n: p.teamSize })} onPress={() => router.push('/me')} style={s.chip}>
          <Icon name="trophy" size={16} color={colors.accent} />
          <AppText variant="footnote" weight="semibold">{t('prog.rank', { rank: p.rank, n: p.teamSize })}</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const BADGE_ICON = { met100: 'people', met500: 'ribbon', phones50: 'call', streak5: 'flame' } as const;

export function Badges() {
  const { t } = useTranslation();
  const p = useMyProgress().data;
  if (!p) return null;
  return (
    <Group header={t('prog.badges', { rank: p.rank })}>
      <View style={s.badges}>
        {p.badges.map((b) => (
          <View key={b.key} style={s.badge} accessible accessibilityLabel={`${t(`prog.badge.${b.key}`)}: ${b.earned ? t('prog.earned') : t('prog.locked', { have: b.have, need: b.need })}`}>
            <View style={[s.medal, { backgroundColor: b.earned ? colors.successTint : colors.fill }]}>
              <Icon name={b.earned ? BADGE_ICON[b.key] : 'lock-closed'} size={22} color={b.earned ? colors.successText : colors.textTertiary} />
            </View>
            <AppText variant="caption" align="center" color={b.earned ? colors.text : colors.textSecondary}>{t(`prog.badge.${b.key}`)}</AppText>
          </View>
        ))}
      </View>
    </Group>
  );
}

const s = themed(() => StyleSheet.create({
  card: { marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.lg, gap: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: colors.fill },
  badges: { flexDirection: 'row', justifyContent: 'space-around', padding: spacing.md },
  badge: { alignItems: 'center', gap: 6, width: 76 },
  medal: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
}));
