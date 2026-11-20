/**
 * V1 + V3: on polling day (inside the window) the volunteer app needs location. Until it is allowed, only the
 * location screen shows. When allowed, tracking runs and an "away" banner appears above every volunteer screen.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { AppState, Linking, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AppText, Button, Icon } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, radius, spacing } from '@/design/tokens';
import { useBooths } from '@/features/data';
import { useActiveMembership } from '@/stores/session';
import { inWindow, nextChange, type BoothPoint, type PollingDay } from './rules';
import { askPermission, checkPermission, configure, flush, reportPermission, startTracking, stopTracking, usePresence, type PermissionInfo } from './tracker';

/** The polling day for the open volunteer team, and whether its window is open now (re-checked on time). */
export function usePollingDay(): { day: PollingDay | null; active: boolean } {
  const m = useActiveMembership();
  const day = m?.role === 'volunteer' ? (m.pollingDay ?? null) : null;
  const [, setTick] = useState(0);
  useEffect(() => {
    // Re-render exactly when the window opens or closes, and every minute as a safety net (device clock changes).
    const at = nextChange(day);
    const t1 = at ? setTimeout(() => setTick((x) => x + 1), Math.min(Math.max(at - Date.now() + 500, 1000), 2 ** 31 - 1)) : undefined;
    const t2 = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => { if (t1) clearTimeout(t1); clearInterval(t2); };
  }, [day]);
  return { day, active: inWindow(day) };
}

export function PollingGate({ children }: { children: ReactNode }) {
  const m = useActiveMembership();
  const { day, active } = usePollingDay();
  const booths = useBooths();
  const [perm, setPerm] = useState<PermissionInfo | null>(null);

  const points: BoothPoint[] = (booths.data ?? [])
    .filter((b) => b.lat != null && b.lng != null && (m?.booths ?? []).includes(b.no))
    .map((b) => ({ no: b.no, lat: b.lat as number, lng: b.lng as number }));
  const pointsKey = points.map((p) => `${p.no}:${p.lat}:${p.lng}`).join('|');

  // Permission: on start, whenever the app comes back to the front, and every 30 s (it can be switched off any time).
  useEffect(() => {
    if (!active) { setPerm(null); void stopTracking(); return; }
    let live = true;
    const check = () => void checkPermission().then((p) => live && setPerm(p));
    check();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && check());
    const iv = setInterval(check, 30_000);
    return () => { live = false; sub.remove(); clearInterval(iv); };
  }, [active]);

  // Allowed → configure and track; not allowed → tell the admin (Location off).
  useEffect(() => {
    if (!active || !day || !m || !perm) return;
    if (booths.data) configure(m.id, day, points);
    if (perm.permission === 'granted' || perm.permission === 'foreground') {
      if (booths.data) void startTracking(perm.permission);
    } else if (perm.permission === 'denied' || perm.permission === 'off') {
      void reportPermission(m.id, perm.permission);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, day?.electionId, day?.radiusM, m?.id, perm?.permission, pointsKey, !!booths.data]);

  // Queued readings go out when possible (they are also sent with each new reading).
  useEffect(() => {
    if (!active) return;
    const iv = setInterval(() => void flush(), 30_000);
    return () => clearInterval(iv);
  }, [active]);

  if (!active || !perm) return <>{children}</>;
  if (perm.permission === 'undetermined' || perm.permission === 'denied' || perm.permission === 'off') {
    return <LocationScreen day={day!} info={perm} onAsk={() => void askPermission().then(setPerm)} />;
  }
  return (
    <View style={s.fill}>
      <AwayBanner />
      <View style={s.fill}>{children}</View>
    </View>
  );
}

/** V1: the only screen until location is allowed. */
function LocationScreen({ day, info, onAsk }: { day: PollingDay; info: PermissionInfo; onAsk: () => void }) {
  const { t } = useTranslation();
  const off = info.permission === 'off';
  const blocked = info.permission === 'denied' && !info.canAskAgain;
  const settings = () => void (Platform.OS === 'web' ? undefined : Linking.openSettings());
  return (
    <SafeAreaView style={s.gate}>
      <View style={s.gateBody} accessibilityRole="alert">
        <View style={s.badge}><Icon name="location" size={44} color={colors.textOnAccent} /></View>
        <AppText variant="largeTitle" align="center">{t('pd.gateTitle')}</AppText>
        <AppText variant="body" align="center" color={colors.textSecondary}>{t('pd.gateWhy')}</AppText>
        <AppText variant="callout" align="center" color={colors.textSecondary}>{t('pd.gateWhen', { name: day.name, from: day.opensAt, to: day.closesAt })}</AppText>
        {off ? <AppText variant="callout" weight="semibold" align="center" color={colors.danger}>{t('pd.servicesOff')}</AppText> : null}
        {blocked ? (
          <AppText variant="callout" weight="semibold" align="center" color={colors.danger}>
            {Platform.OS === 'web' ? t('pd.blockedWeb') : t('pd.blocked')}
          </AppText>
        ) : null}
        <View style={s.gateBtn}>
          {blocked || off ? (
            Platform.OS === 'web' ? <Button label={t('pd.tryAgain')} onPress={onAsk} block /> : <Button label={t('pd.openSettings')} onPress={settings} block />
          ) : (
            <Button label={t('pd.allow')} onPress={onAsk} block />
          )}
        </View>
        {Platform.OS === 'android' ? <AppText variant="footnote" align="center" color={colors.textTertiary}>{t('pd.alwaysHint')}</AppText> : null}
      </View>
    </SafeAreaView>
  );
}

/** V3: shown on every volunteer screen while away from the booth. */
export function AwayBanner() {
  const { t } = useTranslation();
  const local = usePresence((st) => st.local);
  const perm = usePresence((st) => st.permission);
  if (local?.status === 'away') {
    return (
      <SafeAreaView edges={['top']} style={s.away}>
        <View style={s.bannerRow} accessibilityRole="alert" accessibilityLiveRegion="assertive">
          <Icon name="warning" size={22} color={colors.textOnAccent} />
          <View style={s.fill}>
            <AppText variant="headline" color={colors.textOnAccent}>{t('pd.awayTitle')}</AppText>
            <AppText variant="callout" color={colors.textOnAccent}>{t('pd.awayBody', { m: local.distanceM ?? 0, no: local.partNo ?? '' })}</AppText>
          </View>
        </View>
      </SafeAreaView>
    );
  }
  if (perm === 'foreground' && Platform.OS !== 'web') {
    return (
      <SafeAreaView edges={['top']} style={s.info}>
        <View style={s.bannerRow}>
          <Icon name="information-circle" size={20} color={colors.warning} />
          <AppText variant="footnote" style={s.fill}>{t('pd.onlyOpen')}</AppText>
        </View>
      </SafeAreaView>
    );
  }
  return null;
}

const s = themed(() => StyleSheet.create({
  fill: { flex: 1 },
  gate: { flex: 1, backgroundColor: colors.bg },
  gateBody: { flex: 1, maxWidth: 480, width: '100%', alignSelf: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  badge: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.md },
  gateBtn: { marginTop: spacing.lg },
  away: { backgroundColor: colors.danger },
  info: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.separator },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.sm },
}));
