/**
 * ElVote and team branding (spec onboarding-branding OB4, OB7):
 * - BrandHeader: the ElVote mark + wordmark at the top of every sign-in / registration screen.
 * - BrandCard: the team (logo or first letter in the party colour, app name, party · assembly) and the person.
 * - ElVoteFooter: the wordmark and app version at the bottom of Me / More.
 */
import Constants from 'expo-constants';
import { Image, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, radius, spacing } from '@/design/tokens';
import { fileUrl } from '@/features/session/customer';
import { useActiveMembership, useSession } from '@/stores/session';

const WORDMARK = require('../../../assets/brand/logo-horizontal.png');

export function BrandHeader() {
  return (
    <View style={s.header} accessible accessibilityRole="header" accessibilityLabel="ElVote">
      {/* spec flow-fixes O1: the wordmark already carries the mark, so it is shown once. */}
      <Image source={WORDMARK} style={s.wordmark} resizeMode="contain" />
    </View>
  );
}

const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/** Team + person card for the top of Me / More. `roleLabel`: Volunteer / Admin. */
export function BrandCard({ roleLabel }: { roleLabel: string }) {
  const { t } = useTranslation();
  const m = useActiveMembership();
  const user = useSession((st) => st.me?.user);
  const logo = fileUrl(m?.look?.logoUrl);
  const appName = m?.look?.appName || m?.partyName || 'ElVote';
  const tint = m?.look?.colour || colors.accent;
  return (
    <View style={s.card}>
      <View style={s.team}>
        {logo ? (
          <Image source={{ uri: logo }} style={s.logo} accessibilityLabel={appName} />
        ) : (
          <View style={[s.logo, { backgroundColor: tint }]}><AppText variant="title2" weight="bold" color={colors.textOnAccent}>{appName.slice(0, 1).toUpperCase()}</AppText></View>
        )}
        <AppText variant="title2" weight="bold" align="center">{appName}</AppText>
        {m ? <AppText variant="callout" color={colors.textSecondary} align="center">{`${m.partyName} · ${t('admin.acTitle', { no: m.acNo, name: m.acName })}`}</AppText> : null}
      </View>
      <View style={s.sep} />
      <View style={s.person}>
        <View style={s.avatar}><AppText variant="headline" color={colors.accent}>{initialsOf(user?.name ?? '') || '?'}</AppText></View>
        <View style={s.flex}>
          <AppText variant="headline">{user?.name ?? ''}</AppText>
          <AppText variant="callout" color={colors.textSecondary}>{[user?.mobile ? `+91 ${user.mobile}` : null, roleLabel].filter(Boolean).join(' · ')}</AppText>
        </View>
      </View>
    </View>
  );
}

export function ElVoteFooter() {
  const version = Constants.expoConfig?.version ?? '';
  return (
    <View style={s.footer}>
      <Image source={WORDMARK} style={s.footMark} resizeMode="contain" accessibilityLabel="ElVote" />
      <AppText variant="caption" color={colors.textSecondary}>{`Version ${version} · Powered by ElVote`}</AppText>
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  header: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  wordmark: { width: 168, height: 34 },
  card: { marginHorizontal: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, gap: spacing.md },
  team: { alignItems: 'center', gap: spacing.xs },
  logo: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0 },
  footer: { alignItems: 'center', gap: 6, paddingVertical: spacing.lg },
  footMark: { width: 84, height: 16 },
}));
