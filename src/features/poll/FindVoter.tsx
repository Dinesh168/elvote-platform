import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { adminApi, type PollFound } from '@/api/adminApi';
import { ApiError } from '@/api/http';
import type { Voter } from '@/api/types';
import { AppText, Button, Icon, Row, Sheet } from '@/design/components';
import { colors, fonts, radius, spacing } from '@/design/tokens';
import { saveVoter, type SaveHandle } from '@/features/data';
import { activeMembership } from '@/stores/session';

/**
 * spec admin-views P1 (was flow-fixes P1/P2): polling day: one box over the whole assembly — EPIC, name or serial number.
 * The list shows booth, S.No, name, relative, age and whether voted; the volunteer picks the right person and taps Voted.
 * Voters of other booths show no group, phone or notes.
 */
export function FindVoter({ visible, onClose, onSearchName }: { visible: boolean; booth?: number; onClose: () => void; onSearchName: () => void }) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<PollFound[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [marked, setMarked] = useState<Record<string, SaveHandle>>({});

  const ready = q.trim().length >= (/^\d+$/.test(q.trim()) ? 1 : 2);
  const find = async () => {
    const mid = activeMembership()?.id;
    if (!mid || !ready) return;
    setBusy(true);
    setErr(null);
    try {
      setItems((await adminApi.pollFind(mid, q.trim())).items);
    } catch (e) {
      setErr(e instanceof ApiError && e.code === 'network' ? t('auth.network') : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const mark = (v: PollFound) => {
    // Sent through the outbox like every other change (resent after a network drop).
    const before = { id: v.id, booth: v.part, sno: v.sno, name: v.name, votedAt: undefined } as unknown as Voter;
    setMarked((m) => ({ ...m, [v.id]: saveVoter(before, { votedAt: new Date().toISOString() }) }));
  };
  const undo = (v: PollFound) => {
    marked[v.id]?.undo();
    setMarked(({ [v.id]: _, ...rest }) => rest);
  };
  const close = () => { setItems(null); setErr(null); setQ(''); onClose(); };

  return (
    <Sheet visible={visible} title={t('poll.find.title')} onClose={close} footer={t('poll.find.foot')}>
      <View style={s.form}>
        <View style={s.box}>
          <Icon name="search" size={18} color={colors.textSecondary} />
          <TextInput value={q} onChangeText={(x) => { setQ(x); setItems(null); }} onSubmitEditing={() => void find()} returnKeyType="search" autoFocus
            autoCorrect={false} placeholder={t('poll.find.box')} placeholderTextColor={colors.textTertiary} style={s.input} accessibilityLabel={t('poll.find.box')} />
        </View>
        {err ? <AppText variant="callout" color={colors.danger}>{err}</AppText> : null}
        <Button block label={t('poll.find.go')} disabled={!ready || busy} onPress={() => void find()} />
        {items ? <AppText variant="footnote" color={colors.textSecondary}>{items.length ? t('poll.find.count', { count: items.length }) : t('poll.find.none')}</AppText> : null}
      </View>
      <ScrollView style={s.list} keyboardShouldPersistTaps="handled">
        {(items ?? []).map((v) => {
          const done = v.voted || !!marked[v.id];
          return (
            <View key={v.id} style={s.item}>
              <View style={s.flex}>
                <AppText variant="headline" numberOfLines={1}>{v.name}</AppText>
                <AppText variant="footnote" color={colors.textSecondary} numberOfLines={2}>
                  {`${t('common.booth', { no: v.part })} · S.No ${v.sno}${v.relative ? ` · ${v.relative}` : ''}${v.age ? ` · ${v.age}` : ''}${v.own ? '' : ` · ${t('poll.find.otherBooth')}`}`}
                </AppText>
              </View>
              {marked[v.id] ? (
                <Button kind="tinted" compact label={t('common.undo')} onPress={() => undo(v)} />
              ) : done ? (
                <AppText variant="callout" weight="semibold" color={colors.success}>{`✓ ${t('poll.voted')}`}</AppText>
              ) : (
                <Button kind="success" compact label={`✓ ${t('poll.voted')}`} onPress={() => mark(v)} a11yLabel={`${t('poll.markA11y')} ${v.name}`} />
              )}
            </View>
          );
        })}
      </ScrollView>
      <Row title={t('poll.find.byName')} chevron onPress={() => { close(); onSearchName(); }} last />
    </Sheet>
  );
}

const s = StyleSheet.create({
  form: { padding: spacing.lg, gap: spacing.md },
  box: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.fill },
  input: { flex: 1, fontSize: 17, fontFamily: fonts.regular, color: colors.text, paddingVertical: 8 },
  list: { maxHeight: 360 },
  flex: { flex: 1, minWidth: 0 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
});
