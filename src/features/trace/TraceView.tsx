import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { Trace, TraceEvent } from '@/api/adminApi';
import { AppText, Group, Icon } from '@/design/components';
import { colors, group, radius, spacing } from '@/design/tokens';

type Line = { icon: string; color: string; text: string };

/** One history entry → plain words ("Group: Our", "Mobile added", "Marked voted"). Never shows a phone number. */
export function describe(raw: Record<string, unknown>, t: TFunction): Line[] {
  // Older history may store [old, new]; show the new value.
  const change = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[v.length - 1] : v]));
  const out: Line[] = [];
  if ('group' in change) {
    const g = change.group as 'our' | 'target' | 'opp' | null;
    out.push({ icon: 'people', color: g ? group[g].strong : colors.textSecondary, text: t('trace.group', { group: g ? t(`groups.${g}`) : t('groups.none') }) });
  }
  if ('residence' in change) out.push({ icon: 'home', color: colors.textSecondary, text: change.residence === 'moved' ? t('trace.moved') : t('trace.livesHere') });
  if ('needsHelp' in change) out.push({ icon: 'hand-left', color: colors.textSecondary, text: change.needsHelp ? t('trace.needsHelp') : t('trace.noHelp') });
  if ('mobile' in change) out.push({ icon: 'call', color: colors.textSecondary, text: change.mobile ? t('trace.mobileAdded') : t('trace.mobileRemoved') });
  if ('votedAt' in change) out.push({ icon: change.votedAt ? 'checkmark-circle' : 'arrow-undo', color: change.votedAt ? colors.success : colors.warning, text: change.votedAt ? t('trace.voted') : t('trace.votedUndone') });
  if (!out.length) out.push({ icon: 'create', color: colors.textSecondary, text: t('trace.other') });
  return out;
}

const when = (iso: string, lang: string) =>
  new Date(iso).toLocaleString(lang === 'pa' ? 'pa-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/** C9: a voter and the list of changes made to them, newest first. */
export function TraceView({ data, showParty }: { data: Trace; showParty?: boolean }) {
  const { t, i18n } = useTranslation();
  const v = data.voter;
  return (
    <View>
      <Group header={t('trace.voter')}>
        <View style={s.voter}>
          <AppText variant="title2">{v.name}</AppText>
          <AppText variant="callout" color={colors.textSecondary}>
            {[`EPIC ${v.epic}`, t('common.booth', { no: v.booth }), `S.No ${v.sno}`, v.house ? `H.No ${v.house}` : null, v.age ? String(v.age) : null].filter(Boolean).join(' · ')}
          </AppText>
        </View>
      </Group>
      <Group header={t('trace.changes', { count: data.events.length })} footer={t('trace.footer')}>
        {data.events.length === 0 ? (
          <AppText variant="callout" color={colors.textSecondary} style={s.empty}>{t('trace.none')}</AppText>
        ) : (
          data.events.map((e: TraceEvent, i) => (
            <View key={`${e.at}-${i}`} style={[s.event, i < data.events.length - 1 && s.divider]} accessible>
              <View style={s.rail}>
                <View style={[s.dot, i === 0 && s.dotNow]} />
                {i < data.events.length - 1 ? <View style={s.line} /> : null}
              </View>
              <View style={s.flex}>
                <View style={s.head}>
                  <AppText variant="headline" numberOfLines={1} style={s.flex}>{e.by || t('del.deletedUser')}</AppText>
                  <AppText variant="footnote" color={colors.textSecondary} tabular>{when(e.at, i18n.language)}</AppText>
                </View>
                {showParty ? <AppText variant="footnote" color={colors.textSecondary}>{e.party}{e.source !== 'app' ? ` · ${t(`trace.source.${e.source}`)}` : ''}</AppText> : null}
                <View style={s.lines}>
                  {describe(e.change, t).map((l, j) => (
                    <View key={j} style={s.lineRow}>
                      <Icon name={l.icon} size={16} color={l.color} />
                      <AppText variant="callout" color={colors.text}>{l.text}</AppText>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ))
        )}
      </Group>
    </View>
  );
}

const s = StyleSheet.create({
  voter: { padding: spacing.lg, gap: 2 },
  empty: { padding: spacing.lg },
  event: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md, paddingRight: spacing.lg, paddingLeft: spacing.md },
  divider: {},
  rail: { width: 16, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6, backgroundColor: colors.chevron },
  dotNow: { backgroundColor: colors.success },
  line: { flex: 1, width: 2, marginTop: 4, marginBottom: -spacing.md - 6, backgroundColor: colors.ringTrack, borderRadius: radius.full },
  flex: { flex: 1, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lines: { gap: 4, marginTop: 4 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
