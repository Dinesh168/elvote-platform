/**
 * Top of every main tab on phones (spec usability-r2 H1): team logo + team name on the left, status on the right
 * (the quiet sync icon, H2). The page's large title sits below it, like the Polling day page.
 */
import { useState, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Icon } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, spacing } from '@/design/tokens';
import { fileUrl } from '@/features/session/customer';
import { useActiveMembership } from '@/stores/session';
import { SideMenu } from './SideMenu';

export function TeamBar({ trailing }: { trailing?: ReactNode }) {
  const m = useActiveMembership();
  const name = m?.look?.appName || m?.partyName || 'ElVote';
  const logo = fileUrl(m?.look?.logoUrl);
  const tint = m?.look?.colour || colors.accent;
  const { t } = useTranslation();
  const [menu, setMenu] = useState(false);
  return (
    <View style={s.bar}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('side.open')} onPress={() => setMenu(true)} hitSlop={8} style={s.menu}>
        <Icon name="menu" size={26} color={colors.text} />
      </Pressable>
      <SideMenu open={menu} onClose={() => setMenu(false)} />
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
  bar: { height: 44, flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.sm, paddingRight: spacing.lg, gap: spacing.sm },
  menu: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  team: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1, flexGrow: 1 },
  logo: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  name: { flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
}));
