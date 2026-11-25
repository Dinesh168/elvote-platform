import { memo, useState } from 'react';
import { doneProps } from '@/design/components/DoneBar';
import { useFeature } from '@/features/session/customer';
import { themed } from '@/design/theme';
import { router } from 'expo-router';
import { Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { GroupCode, Residence, Voter } from '@/api/types';
import { AppText, GroupPicker, Icon, Select, SnoBadge } from '@/design/components';
import { colors, easy, fonts, group, radius, spacing } from '@/design/tokens';
import { isValidMobile } from '@/lib/phone';
import { useActiveMembership } from '@/stores/session';
import { relText } from './rel';

export const GROUP_ICON: Record<GroupCode | 'none', string> = { our: 'thumbs-up', target: 'swap-horizontal', opp: 'thumbs-down', none: 'help-circle' };

export interface VoterRowProps {
  voter: Voter;
  open: boolean;
  first?: boolean;
  last?: boolean;
  onToggle: (id: string) => void;
  onGroup: (v: Voter, g: GroupCode) => void;
  onPatch: (v: Voter, patch: Partial<Voter>) => void;
  /** spec admin-fixes-r1 V1: opens the house page of this voter's house. */
  onSameAddress?: (house: string) => void;
  /** Voters with this house number in the booth (the button shows when 2 or more). */
  sameCount?: number;
  /** Show the house / address line (lists sorted by serial number). */
  showAddress?: boolean;
}

/**
 * spec easy-redesign V1: one voter card. The whole card takes the group's colour (white = not met); the card being
 * marked gets a thick blue frame and a "Now marking" strip. EPIC, relative and house are always shown.
 */
export const VoterRow = memo(function VoterRow({ voter: v, open, onToggle, onGroup, onPatch, showAddress, onSameAddress, sameCount = 0 }: VoterRowProps) {
  const { t } = useTranslation();
  const slipOn = useFeature('slip');
  const phoneOn = useFeature('addPhone');
  const residenceOn = useFeature('residence');
  const deny = useActiveMembership()?.deny ?? [];
  const canMark = !deny.includes('mark');
  const canAddPhone = phoneOn && !deny.includes('addPhone');
  const [mobile, setMobile] = useState(v.mobile ?? '');
  const [addingPhone, setAddingPhone] = useState(false);
  const mobileBad = mobile.length > 0 && !isValidMobile(mobile);
  const g = v.group ?? 'none';
  const tone = group[g];
  const groupLabel = v.group ? t(`groups.${v.group}`) : t('groups.none');
  const saveMobile = () => {
    if (isValidMobile(mobile) && mobile !== v.mobile) { onPatch(v, { mobile }); setAddingPhone(false); }
  };
  const meta = [t(`voters.g.${v.gender}`, { defaultValue: v.gender }), t('voters.ageN', { n: v.age }), v.house ? t('voters.houseShort', { house: v.house }) : null].filter(Boolean).join(' · ');
  const pills = [
    v.age >= 18 && v.age <= 20 ? { k: 'first', label: t('easy.firstVote'), bg: easy.active } : null,
    v.isNew ? { k: 'new', label: t('voters.newTag'), bg: easy.active } : null,
    v.needsHelp ? { k: 'help', label: t('easy.needsHelp'), bg: easy.helpBlue } : null,
    v.votedAt ? { k: 'voted', label: t('easy.voted'), bg: group.our.text } : null,
    v.residence !== 'here' ? { k: 'res', label: t(`voters.res.${v.residence}`), bg: easy.pill } : null,
  ].filter((x): x is { k: string; label: string; bg: string } => !!x);

  return (
    <View style={[s.card, { backgroundColor: tone.card, borderColor: open ? easy.active : v.group ? tone.strong : easy.tileBorder }, open && s.open]}>
      {open ? (
        <View style={s.strip}>
          <Icon name="hand-left" size={16} color={colors.textOnAccent} />
          <AppText variant="footnote" weight="bold" color={colors.textOnAccent}>{t('easy.nowMarking')}</AppText>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        accessibilityLabel={t('voters.rowA11y', { sno: v.sno, name: v.name, group: groupLabel }) + `, EPIC ${v.epic}`}
        onPress={() => onToggle(v.id)}
        style={({ pressed }) => [s.head, pressed && { opacity: 0.8 }]}
      >
        <SnoBadge sno={v.sno} size={56} />
        <View style={s.texts}>
          <AppText variant="headline" style={s.name} numberOfLines={2}>{v.name}</AppText>
          <AppText variant="callout" color={colors.textSecondary} numberOfLines={1}>{`${relText(t, v.relation)} ${v.relative}`}</AppText>
          {v.epic ? <AppText variant="callout" weight="bold" tabular selectable>{`EPIC ${v.epic}`}</AppText> : null}
          <View style={s.metaRow}>
            <AppText variant="callout" color={colors.textSecondary}>{meta}</AppText>
            {v.mobile ? <View style={s.phone}><Icon name="call" size={14} color={colors.textSecondary} /><AppText variant="footnote" weight="semibold" color={colors.textSecondary}>{t('easy.phone')}</AppText></View> : null}
          </View>
          {showAddress && v.village ? <AppText variant="footnote" color={colors.textSecondary} numberOfLines={1}>{t('voters.addrLine', { house: v.house, ward: v.ward, village: v.village })}</AppText> : null}
          {pills.length ? (
            <View style={s.pills}>
              {pills.map((p) => <View key={p.k} style={[s.pill, { backgroundColor: p.bg }]}><AppText variant="caption" weight="bold" color={colors.textOnAccent}>{p.label}</AppText></View>)}
            </View>
          ) : null}
        </View>
        <View style={s.badgeCol}>
          <View style={[s.badge, { backgroundColor: v.group ? tone.strong : colors.pressed }]}>
            <Icon name={GROUP_ICON[g]} size={24} color={v.group ? colors.textOnAccent : group.none.text} />
          </View>
          <AppText variant="caption" weight="bold" color={tone.text} style={{ textAlign: 'center' }} numberOfLines={2}>{groupLabel}</AppText>
        </View>
      </Pressable>

      {open && (
        <View style={s.body}>
          {canMark ? (
            <GroupPicker value={v.group} voterName={v.name} labels={{ our: t('groups.our'), target: t('groups.target'), opp: t('groups.opp') }} onPick={(x) => onGroup(v, x)} />
          ) : (
            <AppText variant="callout" color={colors.textSecondary}>{t('easy.markOff')}</AppText>
          )}
          <View style={s.acts}>
            {v.mobile ? (
              <ActBtn icon="call" label={t('voters.call')} onPress={() => void Linking.openURL(`tel:${v.mobile}`)} />
            ) : canAddPhone ? (
              <ActBtn icon="add-circle" label={t('easy.addPhone')} onPress={() => setAddingPhone((x) => !x)} on={addingPhone} />
            ) : null}
            {slipOn ? <ActBtn icon="logo-whatsapp" label={t('easy.slip')} onPress={() => router.push({ pathname: '/slip', params: { id: v.id, booth: String(v.booth) } })} /> : null}
            {canMark ? <ActBtn icon="accessibility" label={v.needsHelp ? t('easy.needsHelpOn') : t('easy.needsHelp')} on={v.needsHelp} onPress={() => onPatch(v, { needsHelp: !v.needsHelp })} /> : null}
            {onSameAddress && v.house && sameCount >= 2 ? (
              <ActBtn icon="home" label={t('easy.sameAddress', { n: sameCount })} onPress={() => onSameAddress(v.house)} />
            ) : null}
          </View>
          {addingPhone && canAddPhone ? (
            <View>
              <View style={[s.field, mobileBad && { borderColor: colors.danger }]}>
                <AppText variant="body" color={colors.textSecondary}>+91</AppText>
                <TextInput value={mobile} onChangeText={(x) => setMobile(x.replace(/\D/g, '').slice(0, 10))} onBlur={saveMobile} onSubmitEditing={saveMobile}
                  keyboardType="number-pad" {...doneProps('number-pad')} returnKeyType="done" placeholder={t('voters.mobilePh')} placeholderTextColor={colors.textTertiary}
                  accessibilityLabel={t('voters.mobilePh')} style={s.input} autoFocus />
              </View>
              {mobileBad ? <AppText variant="footnote" color={colors.danger}>{t('voters.mobileInvalid')}</AppText> : null}
            </View>
          ) : null}
          {canMark && residenceOn ? (
            <Select<Residence>
              label={t('easy.livesHere')}
              value={v.residence}
              options={[
                { value: 'here', label: t('voters.res.here') },
                { value: 'moved', label: t('voters.res.moved') },
                { value: 'died', label: t('voters.res.died') },
                { value: 'not_found', label: t('voters.res.not_found') },
              ]}
              onChange={(residence) => onPatch(v, { residence })}
            />
          ) : null}
        </View>
      )}
    </View>
  );
});

function ActBtn({ icon, label, onPress, on }: { icon: string; label: string; onPress: () => void; on?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={onPress}
      style={({ pressed }) => [s.act, on && s.actOn, pressed && { opacity: 0.75 }]}>
      <Icon name={icon} size={20} color={on ? colors.textOnAccent : colors.text} />
      <AppText variant="callout" weight="semibold" color={on ? colors.textOnAccent : colors.text} numberOfLines={2} style={{ flexShrink: 1 }}>{label}</AppText>
    </Pressable>
  );
}

const s = themed(() => StyleSheet.create({
  card: { marginHorizontal: spacing.lg, marginBottom: spacing.md, borderRadius: 18, borderWidth: 2, overflow: 'hidden' },
  open: { borderWidth: 3, shadowColor: easy.active, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  strip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 6, backgroundColor: easy.active },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md },
  texts: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 19, lineHeight: 24 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  phone: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  badgeCol: { width: 72, alignItems: 'center', gap: 4 },
  badge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: 10 },
  acts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  act: { flexGrow: 1, flexBasis: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 52, paddingHorizontal: 8, borderRadius: 14, borderWidth: 1.5, borderColor: easy.tileBorder, backgroundColor: colors.surface },
  actOn: { backgroundColor: easy.helpBlue, borderColor: easy.helpBlue },
  field: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 52, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: easy.tileBorder, backgroundColor: colors.surface },
  input: { flex: 1, fontSize: 18, fontFamily: fonts.regular, color: colors.text },
}));
