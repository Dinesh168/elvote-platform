import { Image, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Icon } from '@/design/components';
import { paletteFrom } from '@/design/theme';
import { colors, radius, spacing } from '@/design/tokens';
import { fileUrl } from '@/features/session/customer';

export interface PreviewLook {
  appName: string | null; colour: string | null; logoUrl: string | null; partyName: string;
  candidateName: string | null; candidatePhotoUrl: string | null; ballotNo: number | null; slogan: string | null; message: string | null;
}

/** C7: a small phone showing what the team will see (Home with the candidate banner, a button, the tab bar). */
export function BrandPreview({ look }: { look: PreviewLook }) {
  const { t } = useTranslation();
  const p = paletteFrom(look.colour);
  const logo = fileUrl(look.logoUrl);
  return (
    <View style={s.phone} accessibilityLabel={t('cms.preview')}>
      <View style={s.status}><AppText variant="caption" weight="semibold">9:41</AppText></View>
      <View style={s.top}>
        {logo ? <Image source={{ uri: logo }} style={s.logo} /> : <View style={[s.logo, { backgroundColor: p.accent }]}><AppText variant="caption" weight="bold" color={colors.textOnAccent}>{(look.appName ?? look.partyName).slice(0, 1)}</AppText></View>}
        <AppText variant="headline" numberOfLines={1} style={s.flex}>{look.appName || 'ElVote'}</AppText>
      </View>
      <View style={s.body}>
        <CandidateBanner look={look} compact />
        {look.message ? (
          <View style={s.msg}>
            <Icon name="chatbubble-ellipses" size={14} color={p.accent} />
            <AppText variant="footnote" style={s.flex} numberOfLines={3}>{look.message}</AppText>
          </View>
        ) : null}
        <View style={[s.btn, { backgroundColor: p.accent }]}><AppText variant="callout" weight="semibold" color={colors.textOnAccent}>{t('home.start')}</AppText></View>
        <View style={s.bar}><View style={[s.barFill, { backgroundColor: p.accent }]} /></View>
      </View>
      <View style={s.tabs}>
        {(['home', 'people', 'checkbox', 'person-circle'] as const).map((n, i) => (
          <Icon key={n} name={i === 0 ? n : `${n}-outline`} size={20} color={i === 0 ? p.accent : colors.textTertiary} />
        ))}
      </View>
    </View>
  );
}

/** C2: candidate banner (photo, name, party, ballot number, slogan) in the party colour. Used on Home and in the preview. */
export function CandidateBanner({ look, compact }: { look: PreviewLook; compact?: boolean }) {
  const { t } = useTranslation();
  const p = paletteFrom(look.colour);
  const photo = fileUrl(look.candidatePhotoUrl);
  if (!look.candidateName) return null;
  const size = compact ? 44 : 64;
  return (
    <View style={[s.banner, compact && s.bannerCompact, { backgroundColor: p.accent }]} accessible accessibilityLabel={[look.candidateName, look.partyName, look.ballotNo ? `${t('slip.ballot')} ${look.ballotNo}` : null, look.slogan].filter(Boolean).join(', ')}>
      {photo ? (
        <Image source={{ uri: photo }} style={[s.photo, { width: size, height: size, borderRadius: size / 2 }]} />
      ) : (
        <View style={[s.photo, { width: size, height: size, borderRadius: size / 2 }]}>
          <AppText variant={compact ? 'headline' : 'title2'} color={p.accent}>{look.candidateName.split(/\s+/).slice(0, 2).map((w) => w[0]).join('')}</AppText>
        </View>
      )}
      <View style={s.flex}>
        <AppText variant={compact ? 'headline' : 'title2'} color={colors.textOnAccent} numberOfLines={2}>{look.candidateName}</AppText>
        <AppText variant={compact ? 'caption' : 'callout'} color={colors.textOnAccent} numberOfLines={1}>{look.partyName}</AppText>
        {look.slogan ? <AppText variant={compact ? 'caption' : 'footnote'} color={colors.textOnAccent} numberOfLines={2} style={s.slogan}>{`“${look.slogan}”`}</AppText> : null}
      </View>
      {look.ballotNo ? (
        <View style={[s.ballot, compact && s.ballotCompact]}>
          <AppText variant="caption" weight="semibold" color={p.accent}>{t('slip.ballot')}</AppText>
          <AppText variant={compact ? 'headline' : 'title2'} color={p.accent} tabular>{String(look.ballotNo)}</AppText>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  phone: { width: 300, alignSelf: 'center', borderRadius: 36, borderWidth: 10, borderColor: colors.deviceFrame, backgroundColor: colors.bg, overflow: 'hidden' },
  status: { height: 26, alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  logo: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  body: { padding: spacing.md, gap: spacing.md, minHeight: 300 },
  msg: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface },
  btn: { height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.ringTrack, overflow: 'hidden' },
  barFill: { width: '40%', height: 6 },
  tabs: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.separator, backgroundColor: colors.surface },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg },
  bannerCompact: { padding: spacing.md, gap: spacing.sm },
  photo: { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  flex: { flex: 1, minWidth: 0 },
  slogan: { opacity: 0.95, marginTop: 2 },
  ballot: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 4 },
  ballotCompact: { paddingHorizontal: spacing.sm },
});
