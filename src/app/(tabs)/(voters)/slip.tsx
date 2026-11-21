import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Platform, Share, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Button, LargeTitle, Screen } from '@/design/components';
import { accentFrom } from '@/design/theme';
import { colors, hairline, radius, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { useBooths, useBranding, useVoters } from '@/features/data';
import { fileUrl } from '@/features/session/customer';
import { shareTextFrom, slipHtml, slipRows, type SlipLabels } from '@/features/slip/slip';
import { localeOf } from '@/i18n';

/** V-CARD-5 / D16: voter slip. Phones share a PDF through the share sheet (WhatsApp first); web prints. */
export default function Slip() {
  const { t, i18n } = useTranslation();
  const { id, booth } = useLocalSearchParams<{ id: string; booth: string }>();
  const votersQ = useVoters(Number(booth));
  const branding = useBranding();
  const boothInfo = useBooths().data?.find((b) => b.no === Number(booth));
  const [error, setError] = useState<string | null>(null);
  const v = votersQ.data?.find((x) => x.id === id);
  const b = branding.data;

  const date = b?.pollDate ? new Date(`${b.pollDate}T12:00:00`).toLocaleDateString(localeOf(i18n.language), { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const L: SlipLabels = {
    ballot: t('slip.ballot'), booth: t('slip.booth'), sno: t('slip.sno'), name: t('slip.name'), relative: t('slip.relative'), age: t('slip.age'),
    gender: t('slip.gender'), address: t('slip.address'), epic: t('slip.epic'),
    pollDay: date ? t('slip.pollDay', { date }) : t('slip.pollDayUnknown'),
    genders: { M: t('admin.male'), F: t('admin.female'), T: t('admin.third') },
    rels: { 'S/o': t('rel.so'), 'W/o': t('rel.wo'), 'D/o': t('rel.do') },
    addr: (x) => t('voters.addrLine', { house: x.house, ward: x.ward, village: x.village }),
  };

  const sharePdf = async () => {
    if (!v || !b) return;
    setError(null);
    try {
      const html = slipHtml(v, boothInfo, b, L, fileUrl(b.candidatePhotoUrl));
      if (Platform.OS === 'web') await Print.printAsync({ html });
      else {
        const { uri } = await Print.printToFileAsync({ html, width: 420, height: 640 });
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: t('slip.title'), UTI: 'com.adobe.pdf' });
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const shareText = () => {
    if (!v) return;
    const lines = [b?.candidateName ?? b?.partyName ?? '', ...slipRows(v, boothInfo, L).map(([k, val]) => `${k}: ${val}`), L.pollDay];
    void Share.share({ message: lines.filter(Boolean).join('\n') });
  };

  return (
    <Screen width="narrow" back={t('tabs.voters')}>
      <LargeTitle title={t('slip.title')} />
      {!votersQ.data || !b ? (
        <QueryState loading={votersQ.isLoading || branding.isLoading} error={votersQ.isError || branding.isError} onRetry={() => { void votersQ.refetch(); void branding.refetch(); }} />
      ) : !v ? (
        <AppText variant="callout" color={colors.textSecondary} align="center" style={s.pad}>{t('slip.notFound')}</AppText>
      ) : (
        <View style={s.pad}>
          <View style={s.card} accessible accessibilityLabel={`${t('slip.title')}: ${v.name}, ${t('slip.sno')} ${v.sno}`}>
            <View style={[s.head, { backgroundColor: accentFrom(b.brandColour) }]}>
              {b.candidatePhotoUrl ? <Image source={{ uri: fileUrl(b.candidatePhotoUrl)! }} style={s.photo} accessibilityIgnoresInvertColors /> : null}
              <View style={s.flex}>
                <AppText variant="title2" color={colors.textOnAccent}>{b.candidateName ?? b.partyName}</AppText>
                <AppText variant="callout" color={colors.textOnAccent}>{b.partyName}</AppText>
                {b.slogan ? <AppText variant="footnote" color={colors.textOnAccent}>{`“${b.slogan}”`}</AppText> : null}
              </View>
              {b.ballotNo ? (
                <View style={s.ballot}>
                  <AppText variant="caption" weight="semibold" color={colors.accent}>{L.ballot}</AppText>
                  <AppText variant="title2" color={colors.accent}>{String(b.ballotNo)}</AppText>
                </View>
              ) : null}
            </View>
            {slipRows(v, boothInfo, L).map(([k, val]) => (
              <View key={k} style={s.row}>
                <AppText variant="callout" color={colors.textSecondary} style={s.key}>{k}</AppText>
                <AppText variant="callout" weight="semibold" style={s.flex}>{val}</AppText>
              </View>
            ))}
            <View style={s.foot}>
              <AppText variant="footnote" color={colors.textSecondary}>{L.pollDay}</AppText>
            </View>
          </View>
          {error ? <AppText variant="footnote" color={colors.danger}>{error}</AppText> : null}
          <Button label={Platform.OS === 'web' ? t('slip.print') : t('slip.share')} onPress={() => void sharePdf()} />
          <Button kind="tinted" label={t('slip.shareText')} onPress={shareText} />
          <AppText variant="footnote" color={colors.textSecondary} align="center">{t('slip.hint')}</AppText>
        </View>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  pad: { padding: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  flex: { flex: 1, minWidth: 0 },
  photo: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surface },
  ballot: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 4 },
  row: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 10, borderTopWidth: hairline, borderTopColor: colors.separator },
  key: { width: 96 },
  foot: { padding: spacing.lg, backgroundColor: colors.bg },
});
