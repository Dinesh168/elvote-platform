/**
 * Top of every main tab on phones (spec usability-r2 H1, easy-redesign O1/V5): a clearly visible ☰ button (grey
 * square, so it shows even before the icon font paints), team logo + name, the speaker (spoken help, when the
 * super-admin turned it on) and the language pill. Status (sync) on the right.
 */
import * as Speech from 'expo-speech';
import { useEffect, useState, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Icon, LangPill } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, easy, spacing } from '@/design/tokens';
import { fileUrl, useFeature } from '@/features/session/customer';
import { useActiveMembership } from '@/stores/session';
import { SideMenu } from './SideMenu';

const VOICE: Record<string, string> = { en: 'en-IN', hi: 'hi-IN', pa: 'pa-IN' };

export function TeamBar({ trailing, say }: { trailing?: ReactNode; say?: string }) {
  const m = useActiveMembership();
  const name = m?.look?.appName || m?.partyName || 'ElVote';
  const logo = fileUrl(m?.look?.logoUrl);
  const tint = m?.look?.colour || colors.accent;
  const { t, i18n } = useTranslation();
  const [menu, setMenu] = useState(false);
  const voiceOn = useFeature('voice');
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => { void Speech.stop(); }, []);
  const speak = () => {
    if (!say) return;
    if (speaking) { void Speech.stop(); setSpeaking(false); return; }
    setSpeaking(true);
    Speech.speak(say, { language: VOICE[i18n.language] ?? 'en-IN', rate: 0.9, onDone: () => setSpeaking(false), onStopped: () => setSpeaking(false), onError: () => setSpeaking(false) });
  };
  return (
    <View style={s.bar}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('side.open')} onPress={() => setMenu(true)} hitSlop={4} style={({ pressed }) => [s.menu, pressed && { opacity: 0.7 }]}>
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
      <View style={s.right}>
        {voiceOn && say ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('easy.listen')} accessibilityState={{ selected: speaking }} onPress={speak} hitSlop={4}
            style={({ pressed }) => [s.menu, speaking && { backgroundColor: easy.active }, pressed && { opacity: 0.7 }]}>
            <Icon name={speaking ? 'stop' : 'volume-high'} size={24} color={speaking ? colors.textOnAccent : easy.active} />
          </Pressable>
        ) : null}
        <LangPill />
        {trailing}
      </View>
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  bar: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.md, paddingRight: spacing.md, gap: spacing.sm },
  menu: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.fill },
  team: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  name: { flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
}));
