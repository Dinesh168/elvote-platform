/**
 * Quiet sync status (spec usability-r2 H2), replacing the always-on "Synced" pill:
 * - everything sent → a small cloud icon with a tick;
 * - work waiting / offline → an amber pill ("3 to send", "Offline · 3 waiting");
 * - something needs attention → a red pill.
 * Tapping opens the Sync sheet: where the work is, last sent time, Send now.
 */
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Button, Icon, Row, Sheet } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, radius, spacing } from '@/design/tokens';
import { syncNow } from '@/features/data';
import { useOutbox } from '@/stores/outbox';
import { useSyncStatus } from './SyncStatus';

const time = (at: string | number | null | undefined) => (at ? new Date(at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—');

export function SyncBadge() {
  const { t } = useTranslation();
  const st = useSyncStatus();
  const last = useOutbox((x) => x.lastSyncedAt);
  const [open, setOpen] = useState(false);
  const quiet = st.tone === 'ok' || st.tone === 'busy';
  const tone = st.tone === 'warn' ? { fg: colors.danger, bg: colors.dangerTint, icon: 'alert-circle' } : { fg: colors.warning, bg: colors.warningTint, icon: 'cloud-upload-outline' };
  return (
    <>
      {quiet ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('sync.a11y', { status: st.label })} onPress={() => setOpen(true)} hitSlop={6} style={s.icon} testID="sync-badge">
          {st.tone === 'busy' ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <>
              <Icon name="cloud-outline" size={24} color={colors.textSecondary} />
              <View style={s.tick}><Icon name="checkmark" size={9} color={colors.textOnAccent} /></View>
            </>
          )}
        </Pressable>
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel={t('sync.a11y', { status: st.label })} onPress={() => setOpen(true)} style={[s.pill, { backgroundColor: tone.bg }]} testID="sync-badge">
          <Icon name={tone.icon} size={15} color={tone.fg} />
          <AppText variant="footnote" weight="semibold" color={tone.fg} numberOfLines={1}>{st.label}</AppText>
        </Pressable>
      )}
      <Sheet visible={open} title={t('sync.title')} onClose={() => setOpen(false)} footer={t('sync.sheetFoot')}>
        <Row title={t('sync.status')} value={st.label} />
        <Row title={t('sync.waitingRow')} value={String(st.pending)} />
        <Row title={t('sync.lastSent')} value={time(last)} last />
        <View style={s.btn}>
          <Button block label={t('sync.sendNow')} onPress={() => void syncNow()} disabled={st.tone === 'busy'} />
        </View>
      </Sheet>
    </>
  );
}

const s = themed(() => StyleSheet.create({
  icon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  tick: { position: 'absolute', right: 4, bottom: 7, width: 13, height: 13, borderRadius: 7, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.bg },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 32, paddingHorizontal: 10, borderRadius: radius.lg, maxWidth: 200 },
  btn: { padding: spacing.md },
}));
