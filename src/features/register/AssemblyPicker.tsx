/**
 * "Your assemblies" (spec usability-r2 A1): full-screen list for states with 100–300+ assemblies.
 * Whole state or chosen assemblies; search by name or number; grouped by district; selected chips; count + Continue.
 */
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, SectionList, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AppText, BackLink, Button, Icon, SegmentedControl } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, fonts, hairline, radius, spacing } from '@/design/tokens';
import { filterAcs, groupAcs, type CatalogAc } from './acGroups';

export function AssemblyPicker({ visible, stateName, list, whole, selected, onDone, onClose }: {
  visible: boolean; stateName: string; list: CatalogAc[]; whole: boolean; selected: number[];
  onDone: (v: { whole: boolean; acs: number[] }) => void; onClose: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [isWhole, setWhole] = useState(whole);
  const [pick, setPick] = useState<number[]>(selected);
  const [q, setQ] = useState('');
  const sections = useMemo(() => groupAcs(filterAcs(list, q), t('assemblies.other')), [list, q, t]);
  const byNo = useMemo(() => new Map(list.map((a) => [a.acNo, a])), [list]);
  const toggle = (no: number) => setPick((x) => (x.includes(no) ? x.filter((n) => n !== no) : [...x, no]));
  const ready = isWhole || pick.length > 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.bar}>
          <BackLink label={t('common.back')} onPress={onClose} />
          <AppText variant="headline" style={s.title} numberOfLines={1} accessibilityRole="header">{t('assemblies.title')}</AppText>
        </View>
        <View style={s.top}>
          <AppText variant="callout" color={colors.textSecondary}>{stateName}</AppText>
          <SegmentedControl
            options={[{ value: 'pick', label: t('assemblies.choose') }, { value: 'whole', label: t('assemblies.whole', { n: list.length }) }]}
            value={isWhole ? 'whole' : 'pick'}
            onChange={(v) => setWhole(v === 'whole')}
          />
          {!isWhole ? (
            <View style={s.search}>
              <Icon name="search" size={18} color={colors.textSecondary} />
              <TextInput value={q} onChangeText={setQ} placeholder={t('assemblies.search')} placeholderTextColor={colors.textTertiary} style={s.input}
                accessibilityLabel={t('assemblies.search')} autoCorrect={false} returnKeyType="search" />
              {q ? <Pressable accessibilityRole="button" accessibilityLabel={t('poll.clear')} onPress={() => setQ('')} hitSlop={8}><Icon name="close-circle" size={18} color={colors.textSecondary} /></Pressable> : null}
            </View>
          ) : null}
          {!isWhole && pick.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
              {pick.map((no) => (
                <Pressable key={no} accessibilityRole="button" accessibilityLabel={`${t('assemblies.remove')} ${no} ${byNo.get(no)?.name ?? ''}`} onPress={() => toggle(no)} style={s.chip}>
                  <AppText variant="footnote" weight="semibold" color={colors.successText}>{`${no} ${byNo.get(no)?.name ?? ''}`}</AppText>
                  <Icon name="close" size={14} color={colors.successText} />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>
        {isWhole ? (
          <View style={s.wholeBox}>
            <Icon name="map-outline" size={40} color={colors.accent} />
            <AppText variant="headline" align="center">{t('assemblies.wholeTitle', { state: stateName, n: list.length })}</AppText>
            <AppText variant="callout" color={colors.textSecondary} align="center">{t('assemblies.wholeBody')}</AppText>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(a) => String(a.acNo)}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            initialNumToRender={30}
            stickySectionHeadersEnabled
            renderSectionHeader={({ section }) => (
              <View style={s.secHead}><AppText variant="footnote" color={colors.textSecondary}>{`${section.title.toLocaleUpperCase()} · ${section.data.length}`}</AppText></View>
            )}
            renderItem={({ item, index, section }) => {
              const on = pick.includes(item.acNo);
              return (
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={`${item.acNo} ${item.name}`}
                  onPress={() => toggle(item.acNo)} style={({ pressed }) => [s.row, index === section.data.length - 1 && s.rowLast, pressed && { backgroundColor: colors.pressed }]}>
                  <View style={s.flex}>
                    <AppText variant="body">{`${item.acNo} · ${item.name}`}</AppText>
                    {item.nameLocal ? <AppText variant="footnote" color={colors.textSecondary}>{item.nameLocal}</AppText> : null}
                  </View>
                  <View style={[s.check, on && s.checkOn]}>{on ? <Icon name="checkmark" size={16} color={colors.textOnAccent} /> : null}</View>
                </Pressable>
              );
            }}
            ListEmptyComponent={<AppText variant="callout" color={colors.textSecondary} align="center" style={s.empty}>{t('assemblies.none')}</AppText>}
            contentContainerStyle={{ paddingBottom: spacing.xl }}
          />
        )}
        <View style={[s.foot, { paddingBottom: insets.bottom + spacing.md }]}>
          <AppText variant="footnote" color={colors.textSecondary} align="center">
            {isWhole ? t('assemblies.wholeCount', { n: list.length }) : t('assemblies.count', { n: pick.length, of: list.length })}
          </AppText>
          <Button block label={t('auth.continue')} disabled={!ready} onPress={() => onDone({ whole: isWhole, acs: isWhole ? [] : pick })} />
        </View>
      </View>
    </Modal>
  );
}

const s = themed(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  bar: { height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm },
  title: { position: 'absolute', left: 96, right: 96, textAlign: 'center' },
  top: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 40, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.fill },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 17, color: colors.text, height: 40 },
  chips: { gap: spacing.sm, paddingVertical: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, paddingLeft: spacing.md, paddingRight: spacing.sm, borderRadius: radius.full, backgroundColor: colors.successTint },
  secHead: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: 6, backgroundColor: colors.bg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48, marginHorizontal: spacing.lg, paddingHorizontal: spacing.lg, paddingVertical: 6, backgroundColor: colors.surface, borderBottomWidth: hairline, borderBottomColor: colors.separator },
  rowLast: { borderBottomWidth: 0 },
  flex: { flex: 1, minWidth: 0 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.chevron, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.success, borderColor: colors.success },
  wholeBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xxl },
  empty: { padding: spacing.xxl },
  foot: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm, borderTopWidth: hairline, borderTopColor: colors.separator, backgroundColor: colors.tabBar },
}));
