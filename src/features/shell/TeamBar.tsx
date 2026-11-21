/**
 * Top of every main tab on phones (spec usability-r2 H1): team logo + team name on the left, status on the right
 * (the quiet sync icon, H2). The page's large title sits below it, like the Polling day page.
 */
import type { ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { AppText } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, spacing } from '@/design/tokens';
import { fileUrl } from '@/features/session/customer';
import { useActiveMembership } from '@/stores/session';

export function TeamBar({ trailing }: { trailing?: ReactNode }) {
  const m = useActiveMembership();
  const name = m?.look?.appName || m?.partyName || 'ElVote';
  const logo = fileUrl(m?.look?.logoUrl);
  const tint = m?.look?.colour || colors.accent;
  return (
    <View style={s.bar}>
      <View style={s.team} accessible accessibilityLabel={name}>
        {logo ? (
          <Image source={{ uri: logo }} style={s.logo} />
        ) : (
          <View style={[s.logo, { backgroundColor: tint }]}>
            <AppText variant="footnote" weight="bold" color={colors.textOnAccent}>{name.slice(0, 1).toUpperCase()}</AppText>
          </View>
        )}
        <AppText variant="callout" weight="semibold" numberOfLines={1} style={s.name}>{name}</AppText>
      </View>
      <View style={s.right}>{trailing}</View>
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  bar: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, gap: spacing.md },
  team: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  logo: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  name: { flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
}));
