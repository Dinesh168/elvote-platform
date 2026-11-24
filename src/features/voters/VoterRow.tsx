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
  onSameAddress: (house: string) => void;
}

/** One voter in the grouped list. Tapping opens it in place (accordion). */
export const VoterRow = memo(function VoterRow({ voter: v, open, first, last, onToggle, onGroup, onPatch, onSameAddress }: VoterRowProps) {
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
          <AppText variant="headline">{v.name}</AppText>
          <AppText variant="callout" color={colors.textSecondary}>{`${relText(t, v.relation)} ${v.relative} · ${v.age}`}</AppText>
          <AppText variant="callout" color={colors.textSecondary}>{t('voters.addrLine', { house: v.house, ward: v.ward, village: v.village })}</AppText>
          {v.isNew ? (
            <View style={s.newTag}><AppText variant="caption" weight="semibold" color={colors.accent}>{t('voters.newTag')}</AppText></View>
          ) : null}
        </View>
        <GroupTag code={v.group} label={groupLabel} />
      </Pressable>

      {open && (
        <View style={s.body}>
          <AppText variant="callout" color={colors.textSecondary}>
            {t('voters.tapGroup')}
          </AppText>
          <GroupPicker
            value={v.group}
            voterName={v.name}
            labels={{ our: t('groups.our'), target: t('groups.target'), opp: t('groups.opp') }}
            onPick={(g) => onGroup(v, g)}
          />
          {/* spec admin-views V1: one dropdown with every answer, on the same card (no other page). */}
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
          <View style={s.qa}>
            <AppText variant="callout" style={s.flex}>{t('voters.needsHelp')}</AppText>
            <SegmentedControl
              variant="answer"
              label={t('voters.needsHelp')}
              style={s.seg}
              value={v.needsHelp ? 'yes' : 'no'}
              options={[{ value: 'no', label: t('voters.no') }, { value: 'yes', label: t('voters.yes') }]}
              onChange={(x) => onPatch(v, { needsHelp: x === 'yes' })}
            />
          </View>
          <View>
            <View style={[s.field, mobileBad && { borderColor: colors.danger, borderWidth: 1 }]}>
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
            {mobileBad ? (
              <AppText variant="footnote" color={colors.danger} style={{ marginTop: 4 }}>
                {t('voters.mobileInvalid')}
              </AppText>
            ) : null}
          </View>
          <View style={s.actions}>
            <Button kind="tinted" compact style={s.flex} label={t('voters.sameAddress')} onPress={() => onSameAddress(v.house)} />
            {slipOn ? (
              <Button
                kind="tinted"
                compact
                style={s.flex}
                label={t('voters.sendSlip')}
                onPress={() => router.push({ pathname: '/slip', params: { id: v.id, booth: String(v.booth) } })}
              />
            ) : null}
            <Button kind="tinted" compact style={s.flex} label={t('voters.call')} disabled={!v.mobile} onPress={() => void Linking.openURL(`tel:${v.mobile}`)} />
          </View>
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
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: 14 },
  qa: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  seg: { width: 176 },
  flex: { flex: 1 },
  field: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 44, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.fill },
  input: { flex: 1, fontSize: 17, fontFamily: fonts.regular, color: colors.text },
  actions: { flexDirection: 'row', gap: spacing.sm },
  newTag: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, backgroundColor: colors.accentTint },
}));
