import { useSyncStatus } from '@/features/sync/SyncStatus';
import { useAllowedLangs, useFeature } from '@/features/session/customer';
import { themed } from '@/design/theme';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BrandCard, ElVoteFooter } from '@/features/shell/Brand';
import { LanguageRow } from '@/features/shell/LanguageRow';
import { API_MODE } from '@/api/client';
import { http } from '@/api/http';
import { AppText, Button, Group, IconSquare, LargeTitle, Row, Screen } from '@/design/components';
import { Badges } from '@/features/home/Progress';
import { TeamBar } from '@/features/shell/TeamBar';
import { SyncBadge } from '@/features/sync/SyncBadge';
import { useSignOut } from '@/features/session/useSignOut';
import { colors, spacing } from '@/design/tokens';
import { syncNow, useBooths } from '@/features/data';
import { rolesOf } from '@/features/session/session';
import { useOutbox } from '@/stores/outbox';
import { usePrefs } from '@/stores/prefs';
import { activeMembership, useSession } from '@/stores/session';
import { usePollingDay } from '@/features/pollingDay/PollingGate';
import { useAgo } from '@/features/pollingDay/PollingView';
import { usePresence } from '@/features/pollingDay/tracker';
import { localeOf } from '@/i18n';


/** V-GEN-3 Me: who I am, my booths, language, sync, booth location (D17), switch role, log out. */
export default function MeScreen() {
  const { t, i18n } = useTranslation();
  const booths = useBooths().data ?? [];
  const booth = usePrefs((s) => s.booth);
  const session = useSession((s) => s.me);
  const pending = useOutbox((s) => s.items.length);
  const draining = useOutbox((s) => s.draining);
  const problems = useOutbox((s) => s.problems);
  const lastSyncedAt = useOutbox((s) => s.lastSyncedAt);
  const sync = useSyncStatus();
  const when = (iso: string) => new Date(iso).toLocaleString(localeOf(i18n.language), { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const signOut = useSignOut();
  const gpsOn = useFeature('boothGps');
  const langs = useAllowedLangs();
  const [loc, setLoc] = useState<{ ok: boolean; text: string } | null>(null);
  const roles = session ? rolesOf(session) : [];

  const setLocation = async () => {
    setLoc(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') return setLoc({ ok: false, text: t('me3.locationDenied') });
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const m = activeMembership();
      if (API_MODE === 'http' && m) await http.put(`/v1/m/${m.id}/booths/${booth}/location`, { lat: p.coords.latitude, lng: p.coords.longitude });
      setLoc({ ok: true, text: t('me3.locationSaved', { no: booth }) });
    } catch (e) {
      setLoc({ ok: false, text: (e as Error).message });
    }
  };

  return (
    <Screen width="narrow" header={<TeamBar trailing={<SyncBadge />} />} trailing={<SyncBadge />}>
      <LargeTitle title={t('tabs.me')} />
      <BrandCard roleLabel={t('web.roleVolunteer')} />

      <Badges />
      <Group header={t('me3.booths')}>
        {booths.map((b, i) => (
          <Row key={b.no} title={`${t('common.booth', { no: b.no })} · ${b.name}`} subtitle={b.village} leading={<IconSquare name="location" bg={colors.accent} />} last={i === booths.length - 1} />
        ))}
      </Group>

      <Group header={t('me2.settings')}>
        <LanguageRow langs={langs} />
      </Group>

      <PollingDayMe />

      <Group header={t('me3.sync')} footer={t(`sync.modeHint.${sync.cfg.mode}`, { n: sync.cfg.minutes })}>
        <Row title={t(`sync.mode.${sync.cfg.mode}`, { n: sync.cfg.minutes })} subtitle={t('sync.modeSetBy')} leading={<IconSquare name="swap-vertical" bg={colors.accent} />} />
        <Row title={pending ? t('me3.pending', { n: pending }) : t('me3.synced')} subtitle={`${t('sync.lastSync')}: ${lastSyncedAt ? when(lastSyncedAt) : t('sync.never')}`}
          leading={<IconSquare name={pending ? 'cloud-upload' : 'cloud-done'} bg={pending ? colors.iconTask : colors.success} />} />
        <Row title={t('me3.syncNow')} titleColor={colors.accent} onPress={draining ? undefined : () => void syncNow()} last />
      </Group>

      {problems.length ? (
        <Group header={t('sync.attentionTitle')} footer={t('sync.attentionHint')}>
          {problems.map((p, i) => (
            <Row key={p.write.id} title={`${t('common.booth', { no: p.write.booth ?? '—' })} · ${Object.keys(p.write.patch).join(', ')}`}
              subtitle={`${t(`sync.reason.${p.code}`, { defaultValue: p.message || t('sync.reason.error') })} · ${when(p.write.at)}`}
              leading={<IconSquare name="alert-circle" bg={colors.danger} />} last={i === problems.length - 1}
              trailing={
                <View style={s.probBtns}>
                  <Button kind="tinted" compact label={t('sync.retry')} onPress={() => { useOutbox.getState().retryProblem(p.write.id); void syncNow(); }} />
                  <Button kind="plain" compact label={t('sync.dismiss')} onPress={() => useOutbox.getState().dismissProblem(p.write.id)} />
                </View>
              } />
          ))}
        </Group>
      ) : null}

      {gpsOn ? (
        <Group footer={loc?.text ?? t('me3.locationHint', { no: booth })}>
          <Row title={t('me3.setLocation')} leading={<IconSquare name="navigate" bg={colors.accent} />} onPress={() => void setLocation()} last
            trailing={loc ? <AppText variant="callout" color={loc.ok ? colors.success : colors.danger}>{loc.ok ? '✓' : '!'}</AppText> : null} />
        </Group>
      ) : null}

      {API_MODE === 'http' ? (
        <Group header={t('me2.account')}>
          {roles.length > 1 ? <Row title={t('me2.switchRole')} chevron onPress={() => router.push('/choose')} /> : null}
          <Row title={t('auth.logout')} titleColor={colors.danger} leading={<IconSquare name="log-out-outline" bg={colors.danger} />} onPress={signOut.ask} last />
        </Group>
      ) : null}
      {API_MODE === 'http' ? (
        <Group>
          <Row title={t('del.row')} titleColor={colors.danger} leading={<IconSquare name="trash" bg={colors.danger} />} chevron onPress={() => router.push('/delete-account')} last />
        </Group>
      ) : null}
      <ElVoteFooter />
      {signOut.dialog}
    </Screen>
  );
}

const s = themed(() => StyleSheet.create({
  profile: { alignItems: 'center', gap: 4, paddingTop: spacing.lg },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  probBtns: { flexDirection: 'row', gap: 4 },
  version: { paddingTop: spacing.xl },
}));

/** Polling day on Me (spec polling-day V1–V3): the date before, the live status during. */
function PollingDayMe() {
  const { t, i18n } = useTranslation();
  const { day, active } = usePollingDay();
  const local = usePresence((st) => st.local);
  const perm = usePresence((st) => st.permission);
  const queue = usePresence((st) => st.queue.length);
  const lastSentAt = usePresence((st) => st.lastSentAt);
  const ago = useAgo();
  if (!day) return null;
  const date = new Date(`${day.date}T12:00:00Z`).toLocaleDateString(localeOf(i18n.language), { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  if (!active) {
    return (
      <Group header={t('pd.meTitle')}>
        <Row title={day.name} subtitle={t('pd.meNext', { date, from: day.opensAt, to: day.closesAt })} leading={<IconSquare name="calendar" bg={colors.accent} />} last />
      </Group>
    );
  }
  const st = local?.status ?? 'checking';
  const dist = local?.distanceM != null ? ` · ${t('pd.m', { m: local.distanceM })}` : '';
  return (
    <Group header={t('pd.meTitle')} footer={t('pd.gateWhy')}>
      <Row title={t(`pd.st.${st}`)} subtitle={`${local?.partNo ? t('common.booth', { no: local.partNo }) : ''}${dist}`}
        leading={<IconSquare name={st === 'away' ? 'warning' : st === 'at_booth' ? 'checkmark-circle' : 'locate'} bg={st === 'away' ? colors.danger : st === 'at_booth' ? colors.success : colors.accent} />} />
      <Row title={perm ? t(`pd.meMode.${perm}`) : t('pd.st.checking')} subtitle={queue ? t('pd.meWaiting') : lastSentAt ? t('pd.meSent', { when: ago(new Date(lastSentAt).toISOString()) }) : undefined}
        leading={<IconSquare name="navigate" bg={colors.accent} />} last />
    </Group>
  );
}

