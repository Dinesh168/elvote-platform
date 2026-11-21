import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Platform, Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/api/adminApi';
import { API_URL } from '@/api/http';
import { AppText, Button, Group, LargeTitle, Screen } from '@/design/components';
import { ConfirmDialog } from '@/design/components/ConfirmDialog';
import { themed } from '@/design/theme';
import { colors, radius, spacing } from '@/design/tokens';
import { joinLink } from '@/features/join/joinCode';
import { useActiveMembership } from '@/stores/session';

/** The site that serves the app (the QR link opens /join there). */
const siteOrigin = () => (Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : API_URL.replace(/\/api$/, ''));
const keyOf = (mid: string) => `elvote.teamcode.${mid}`;

/**
 * Admin → More → Team QR code (spec usability-r2 J3). Volunteers scan it in Join team (or with the phone camera, which
 * opens the join page). The server keeps only a hash of the code, so this device remembers the code it created;
 * "New code" replaces it and the old code / printed QR stop working.
 */
export default function TeamQr() {
  const { t } = useTranslation();
  const m = useActiveMembership();
  const mid = m?.id ?? '';
  const [code, setCode] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mid) return;
    void AsyncStorage.getItem(keyOf(mid)).then((c) => { setCode(c); setLoaded(true); }).catch(() => setLoaded(true));
  }, [mid]);

  const create = async () => {
    setAsk(false);
    setBusy(true);
    setError(null);
    try {
      const r = await adminApi.newJoinCode(mid);
      setCode(r.code);
      await AsyncStorage.setItem(keyOf(mid), r.code).catch(() => undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const link = code ? joinLink(siteOrigin(), code) : '';
  const team = m ? `${m.look?.appName || m.partyName} · ${t('admin.acTitle', { no: m.acNo, name: m.acName })}` : '';

  return (
    <Screen width="narrow" back={t('admin.tabs.more')}>
      <LargeTitle title={t('qr.title')} subtitle={team} />
      {code ? (
        <View style={s.card} accessible accessibilityLabel={t('qr.a11y', { code })}>
          <View style={s.qr}><QRCode value={link} size={220} color={colors.text} backgroundColor={colors.surface} /></View>
          <AppText variant="footnote" color={colors.textSecondary}>{t('qr.codeLabel')}</AppText>
          <AppText variant="largeTitle" weight="bold" tabular style={s.code} selectable>{code}</AppText>
          <AppText variant="callout" color={colors.textSecondary} align="center">{t('qr.howTo')}</AppText>
        </View>
      ) : loaded ? (
        <Group footer={t('qr.noneHint')}>
          <View style={s.empty}><AppText variant="body" align="center">{t('qr.none')}</AppText></View>
        </Group>
      ) : null}
      {error ? <AppText variant="footnote" color={colors.danger} style={s.err}>{error}</AppText> : null}
      <View style={s.btns}>
        {code ? <Button block label={t('qr.share')} onPress={() => void Share.share({ message: t('qr.shareText', { team, code, link }) })} /> : null}
        <Button block kind={code ? 'tinted' : 'filled'} label={code ? t('qr.newCode') : t('qr.create')} disabled={busy || !mid} onPress={() => (code ? setAsk(true) : void create())} />
      </View>
      <ConfirmDialog visible={ask} onDismiss={() => setAsk(false)} title={t('qr.newTitle')} message={t('qr.newBody')}
        actions={[{ label: t('common.cancel'), style: 'cancel', onPress: () => setAsk(false) }, { label: t('qr.newCode'), style: 'destructive', onPress: () => void create() }]} />
    </Screen>
  );
}

const s = themed(() => StyleSheet.create({
  card: { marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.xl, borderRadius: radius.lg, backgroundColor: colors.surface, alignItems: 'center', gap: spacing.sm },
  qr: { padding: spacing.md, backgroundColor: colors.surface },
  code: { letterSpacing: 4 },
  empty: { padding: spacing.xl },
  err: { paddingHorizontal: spacing.xl },
  btns: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.md },
}));
