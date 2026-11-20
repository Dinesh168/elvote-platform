import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Button, Group, Icon, LargeTitle, Screen, SnoBadge, Toast } from '@/design/components';
import { colors, hairline, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { saveVoter, useVoters, type SaveHandle } from '@/features/data';
import { helpList } from '@/features/poll/help';
import { usePrefs } from '@/stores/prefs';

/** V-POLL-6: voters who need help to vote and have not voted, by house; Voted marks them with Undo. */
export default function Help() {
  const { t } = useTranslation();
  const booth = usePrefs((s) => s.booth);
  const q = useVoters(booth);
  const houses = useMemo(() => (q.data ? helpList(q.data, booth) : []), [q.data, booth]);
  const [toast, setToast] = useState<string | null>(null);
  const handle = useRef<SaveHandle | null>(null);

  return (
    <Screen width="medium" back={t('tabs.poll')} scroll>
      <LargeTitle title={t('help.title')} subtitle={t('help.sub', { no: booth })} />
      {!q.data ? (
        <QueryState loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} />
      ) : houses.length === 0 ? (
        <View style={s.empty}>
          <Icon name="checkmark-circle" size={64} color={colors.success} />
          <AppText variant="title2" align="center">{t('help.emptyTitle')}</AppText>
          <AppText variant="body" color={colors.textSecondary} align="center">{t('help.emptyBody')}</AppText>
        </View>
      ) : (
        houses.map((h) => (
          <Group key={h.house} header={t('help.house', { no: h.house })}>
            {h.voters.map((v, i) => (
              <View key={v.id} style={[s.row, i < h.voters.length - 1 && s.divider]}>
                <SnoBadge sno={v.sno} size={40} />
                <View style={s.flex}>
                  <AppText variant="headline">{v.name}</AppText>
                  <AppText variant="callout" color={colors.textSecondary}>{`${v.relation} ${v.relative} · ${v.age}${v.mobile ? ` · ${v.mobile}` : ''}`}</AppText>
                </View>
                <Button kind="success" compact label={`✓ ${t('help.voted')}`} a11yLabel={t('help.votedA11y', { name: v.name })}
                  onPress={() => { handle.current = saveVoter(v, { votedAt: new Date().toISOString() }); setToast(t('help.marked', { name: v.name })); }} />
              </View>
            ))}
          </Group>
        ))
      )}
      {toast ? <Toast message={toast} onUndo={() => { handle.current?.undo(); setToast(null); }} onHide={() => setToast(null)} /> : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xxxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, paddingLeft: spacing.lg, backgroundColor: colors.surface },
  divider: { borderBottomWidth: hairline, borderBottomColor: colors.separator },
  flex: { flex: 1, minWidth: 0 },
});
