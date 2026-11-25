import { useEffect, useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Icon, LargeTitle, Screen, SnoBadge } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, hairline, radius, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { useVoters } from '@/features/data';
import { usePollingDay } from '@/features/pollingDay/PollingGate';
import { usePrefs } from '@/stores/prefs';

const IST_OFFSET_MS = 5.5 * 3600_000;

/** Minutes until voting closes (India time), or null when there is no polling day / it is over. */
function minutesLeft(day: { date: string; closesAt: string } | null, now: number) {
  if (!day) return null;
  const close = Date.parse(`${day.date}T${day.closesAt}:00Z`) - IST_OFFSET_MS;
  const m = Math.floor((close - now) / 60_000);
  return m > 0 ? m : null;
}

/**
 * Polling day → Call list (spec map-trend P1): "ours" and "needs help" voters of the booth who have not voted yet,
 * with a call button (or the house number when there is no phone), and a countdown to closing. Works offline from the
 * voters already on the phone.
 */
export default function CallListScreen() {
  const { t } = useTranslation();
  const booth = usePrefs((s) => s.booth);
  const q = useVoters(booth);
  const { day } = usePollingDay();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const left = minutesLeft(day, now);
  const list = useMemo(
    () => (q.data ?? []).filter((v) => !v.votedAt && (v.group === 'our' || v.needsHelp)).sort((a, b) => Number(!!b.mobile) - Number(!!a.mobile) || a.sno - b.sno),
    [q.data],
  );

  return (
    <Screen back={t('tabs.poll')} scroll={false}>
      <LargeTitle title={t('call.title', { count: list.length })} subtitle={t('common.booth', { no: booth })} />
      {left !== null ? (
        <View style={s.clock} accessible accessibilityLabel={t('call.left', { h: Math.floor(left / 60), m: left % 60, time: day?.closesAt })}>
          <Icon name="time" size={28} color={colors.textOnAccent} />
          <View>
            <AppText variant="title2" color={colors.textOnAccent} tabular>{`${Math.floor(left / 60)} h ${left % 60} m`}</AppText>
            <AppText variant="footnote" color={colors.textOnAccent}>{t('call.until', { time: day?.closesAt })}</AppText>
          </View>
        </View>
      ) : null}
      {!q.data ? (
        <QueryState loading={q.isLoading} error={q.isError} err={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(v) => v.id}
          initialNumToRender={20}
          contentContainerStyle={s.list}
          ListEmptyComponent={<AppText variant="callout" color={colors.textSecondary} align="center" style={s.empty}>{t('call.none')}</AppText>}
          renderItem={({ item: v, index }) => (
            <View style={[s.row, index === 0 && s.first, index === list.length - 1 && s.last]}>
              <SnoBadge sno={v.sno} size={44} />
              <View style={s.flex}>
                <AppText variant="headline" numberOfLines={1}>{v.name}</AppText>
                <AppText variant="footnote" color={v.needsHelp ? colors.iconTask : colors.textSecondary}>
                  {v.needsHelp ? t('call.help') : t('voters.houseShort', { house: v.house })}
                </AppText>
              </View>
              {v.mobile ? (
                <Pressable accessibilityRole="button" accessibilityLabel={t('call.call', { name: v.name })} onPress={() => void Linking.openURL(`tel:${v.mobile}`)} style={s.callBtn}>
                  <Icon name="call" size={22} color={colors.textOnAccent} />
                </Pressable>
              ) : (
                <View style={s.visit} accessible accessibilityLabel={t('call.visit', { house: v.house })}>
                  <Icon name="home" size={18} color={colors.textSecondary} />
                  <AppText variant="caption" color={colors.textSecondary}>{v.house}</AppText>
                </View>
              )}
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const s = themed(() => StyleSheet.create({
  clock: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.danger },
  list: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  empty: { padding: spacing.xxxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderBottomWidth: hairline, borderBottomColor: colors.separator },
  first: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  last: { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg, borderBottomWidth: 0 },
  flex: { flex: 1, minWidth: 0 },
  callBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  visit: { minWidth: 48, alignItems: 'center' },
}));
