/**
 * spec easy-redesign V4: opening the Poll day tab asks for location first (one big button). After that a strip shows
 * whether the volunteer is at the booth. Booth locations come with the data; volunteers cannot set them.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Icon } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, easy, group, spacing } from '@/design/tokens';
import { askPermission, checkPermission, usePresence, type PermissionInfo } from '@/features/pollingDay/tracker';

export function PollLocation({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [info, setInfo] = useState<PermissionInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const server = usePresence((s) => s.server);
  useFocusEffect(useCallback(() => {
    let live = true;
    void checkPermission().then((x) => { if (live) setInfo(x); });
    return () => { live = false; };
  }, []));
  const ok = info && (info.permission === 'granted' || info.permission === 'foreground');
  if (Platform.OS === 'web' && !info) return <>{children}</>;
  if (info && !ok) {
    const blocked = info.permission === 'denied' && !info.canAskAgain;
    const servicesOff = info.permission === 'off';
    const allow = async () => {
      if (blocked || servicesOff) { void Linking.openSettings(); return; }
      setBusy(true);
      setInfo(await askPermission());
      setBusy(false);
    };
    return (
      <View style={s.gate}>
        <View style={s.gateIcon}><Icon name="location" size={56} color={easy.active} /></View>
        <AppText variant="title2" align="center">{t('pd.gateTitle')}</AppText>
        <AppText variant="body" align="center" color={colors.textSecondary}>{servicesOff ? t('pd.servicesOff') : blocked ? t('pd.blocked') : t('pd.gateWhy')}</AppText>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void allow()} style={({ pressed }) => [s.allow, (pressed || busy) && { opacity: 0.8 }]}>
          <Icon name="location" size={26} color={colors.textOnAccent} />
          <AppText variant="title2" weight="bold" color={colors.textOnAccent}>{blocked || servicesOff ? t('pd.openSettings') : t('pd.allow')}</AppText>
        </Pressable>
        <AppText variant="callout" align="center" color={colors.textSecondary}>{t('pd.alwaysHint')}</AppText>
      </View>
    );
  }
  const away = server?.status === 'away';
  const at = server?.status === 'at_booth';
  return (
    <>
      {at || away ? (
        <View style={[s.strip, { backgroundColor: away ? group.opp.card : group.our.card, borderColor: away ? group.opp.strong : group.our.strong }]}>
          <Icon name={away ? 'warning' : 'location'} size={24} color={away ? group.opp.text : group.our.text} />
          <View style={{ flex: 1 }}>
            <AppText variant="headline" color={away ? group.opp.text : group.our.text}>{away ? t('easy.awayFrom', { no: server?.partNo ?? '' }) : t('easy.atBooth', { no: server?.partNo ?? '' })}</AppText>
            {server?.distanceM != null ? <AppText variant="footnote" color={away ? group.opp.text : group.our.text}>{t('pd.mAway', { m: server.distanceM })}</AppText> : null}
          </View>
        </View>
      ) : null}
      {children}
    </>
  );
}

const s = themed(() => StyleSheet.create({
  gate: { margin: spacing.lg, padding: spacing.xl, borderRadius: 24, backgroundColor: colors.surface, alignItems: 'center', gap: spacing.md },
  gateIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: easy.helpTint, alignItems: 'center', justifyContent: 'center' },
  allow: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 64, borderRadius: 18, backgroundColor: easy.active },
  strip: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.sm, padding: spacing.md, borderRadius: 18, borderWidth: 2 },
}));
