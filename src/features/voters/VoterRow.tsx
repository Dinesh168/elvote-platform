import { memo, useState } from 'react';
import { doneProps } from '@/design/components/DoneBar';
import { useFeature } from '@/features/session/customer';
import { themed } from '@/design/theme';
import { router } from 'expo-router';
import { Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { GroupCode, Residence, Voter } from '@/api/types';
import { AppText, Button, GroupPicker, GroupTag, SegmentedControl, Select, SnoBadge } from '@/design/components';
import { colors, fonts, hairline, radius, spacing } from '@/design/tokens';
import { isValidMobile } from '@/lib/phone';
import { relText } from './rel';

export interface VoterRowProps {
  voter: Voter;
  open: boolean;
  first: boolean;
  last: boolean;
  onToggle: (id: string) => void;
  onGroup: (v: Voter, g: GroupCode) => void;
  onPatch: (v: Voter, patch: Partial<Voter>) => void;
  onSameAddress?: (house: string) => void;
  /** Serial-no. view: the address is shown on the row (house-wise shows it once on the house header). */
  showAddress?: boolean;
}

/** One voter in the grouped list. Tapping opens it in place (accordion). */
export const VoterRow = memo(function VoterRow({ voter: v, open, first, last, onToggle, onGroup, onPatch, showAddress }: VoterRowProps) {
  const { t } = useTranslation();
  const slipOn = useFeature('slip');
  const [mobile, setMobile] = useState(v.mobile ?? '');
  const mobileBad = mobile.length > 0 && !isValidMobile(mobile);
  const groupLabel = v.group ? t(`groups.${v.group}`) : t('groups.none');
  const saveMobile = () => {
    if (isValidMobile(mobile) && mobile !== v.mobile) onPatch(v, { mobile });
  };

  return (
    <View style={[s.wrap, first && s.first, last && s.last, open && s.open]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        accessibilityLabel={t('voters.rowA11y', { sno: v.sno, name: v.name, group: groupLabel })}
        onPress={() => onToggle(v.id)}
        style={({ pressed }) => [s.head, pressed && { backgroundColor: colors.pressed }]}
      >
        <SnoBadge sno={v.sno} />
        <View style={s.texts}>
          {/* spec voter-card C1: name, relative, then age · gender · EPIC as chips; the address only in serial-no. view. */}
          <AppText variant="headline" numberOfLines={2}>{v.name}</AppText>
          <AppText variant="callout" color={colors.textSecondary} numberOfLines={1}>{`${relText(t, v.relation)} ${v.relative}`}</AppText>
          <View style={s.chips}>
            <View style={s.chip}><AppText variant="footnote" weight="semibold" tabular>{t('voters.ageN', { n: v.age })}</AppText></View>
            {v.gender ? <View style={s.chip}><AppText variant="footnote" weight="semibold">{t(`voters.g.${v.gender}`)}</AppText></View> : null}
            {v.epic ? <View style={s.chip}><AppText variant="footnote" weight="semibold" tabular>{v.epic}</AppText></View> : null}
          </View>
          {showAddress ? <AppText variant="footnote" color={colors.textSecondary} numberOfLines={1}>{t('voters.addrLine', { house: v.house, ward: v.ward, village: v.village })}</AppText> : null}
          {v.isNew ? (
            <View style={s.newTag}><AppText variant="caption" weight="semibold" color={colors.accent}>{t('voters.newTag')}</AppText></View>
          ) : null}
        </View>
        <GroupTag code={v.group} label={groupLabel} />
      </Pressable>

      {open && (
        <View style={s.body}>
          <GroupPicker
            compact
            value={v.group}
            voterName={v.name}
            labels={{ our: t('groups.our'), target: t('groups.target'), opp: t('groups.opp') }}
            onPick={(g) => onGroup(v, g)}
          />
          {/* spec voter-card C3: Lives here and Needs help side by side. */}
          <View style={s.two}>
            <View style={s.flex}>
              <Select<Residence>
                label={t('voters.livesHere')}
                value={v.residence}
                options={[
                  { value: 'here', label: t('voters.res.here') },
                  { value: 'moved', label: t('voters.res.moved') },
                  { value: 'died', label: t('voters.res.died') },
                  { value: 'not_found', label: t('voters.res.not_found') },
                ]}
                onChange={(residence) => onPatch(v, { residence })}
              />
            </View>
            <View style={s.flex}>
              <Select<'no' | 'yes'>
                label={t('voters.needsHelp')}
                value={v.needsHelp ? 'yes' : 'no'}
                options={[{ value: 'no', label: t('voters.no') }, { value: 'yes', label: t('voters.yes') }]}
                onChange={(x) => onPatch(v, { needsHelp: x === 'yes' })}
              />
            </View>
          </View>
          <View style={s.mobileRow}>
            <View style={[s.field, s.flex, mobileBad && { borderColor: colors.danger, borderWidth: 1 }]}>
              <AppText variant="body" color={colors.textSecondary}>+91</AppText>
              <TextInput
                value={mobile}
                onChangeText={(x) => setMobile(x.replace(/\D/g, '').slice(0, 10))}
                onBlur={saveMobile}
                onSubmitEditing={saveMobile}
                keyboardType="number-pad"
                {...doneProps('number-pad')}
                returnKeyType="done"
                placeholder={t('voters.mobilePh')}
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel={t('voters.mobilePh')}
                style={s.input}
              />
            </View>
            <Button kind="tinted" compact label={t('voters.call')} disabled={!v.mobile} onPress={() => void Linking.openURL(`tel:${v.mobile}`)} />
            {slipOn ? (
              <Button kind="tinted" compact label={t('voters.slipShort')} onPress={() => router.push({ pathname: '/slip', params: { id: v.id, booth: String(v.booth) } })} />
            ) : null}
          </View>
          {mobileBad ? <AppText variant="footnote" color={colors.danger}>{t('voters.mobileInvalid')}</AppText> : null}
        </View>
      )}
    </View>
  );
});

const s = themed(() => StyleSheet.create({
  wrap: { marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: hairline, borderBottomColor: colors.separator, overflow: 'hidden' },
  first: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  last: { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg, borderBottomWidth: 0 },
  open: { borderLeftWidth: 3, borderLeftColor: colors.accent },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 10, paddingHorizontal: spacing.lg },
  texts: { flex: 1, minWidth: 0 },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: 10 },
  qa: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  seg: { width: 176 },
  flex: { flex: 1 },
  field: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 44, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.fill },
  input: { flex: 1, fontSize: 17, fontFamily: fonts.regular, color: colors.text },
  two: { flexDirection: 'row', gap: spacing.sm },
  mobileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm, backgroundColor: colors.fill },
  newTag: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, backgroundColor: colors.accentTint },
}));
