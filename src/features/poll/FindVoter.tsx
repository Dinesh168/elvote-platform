import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { adminApi, type PollFound } from '@/api/adminApi';
import { ApiError } from '@/api/http';
import type { Voter } from '@/api/types';
import { AppText, Button, Field, Row, SegmentedControl, Sheet } from '@/design/components';
import { colors, spacing } from '@/design/tokens';
import { saveVoter, type SaveHandle } from '@/features/data';
import { activeMembership } from '@/stores/session';

/**
 * spec flow-fixes P1/P2: polling day: find any voter of the assembly by EPIC, or booth + serial number, and mark Voted.
 * Voters of other booths show only name, relative, age, booth and S.No.
 */
export function FindVoter({ visible, booth, onClose, onSearchName }: { visible: boolean; booth: number; onClose: () => void; onSearchName: () => void }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'epic' | 'sno'>('epic');
  const [epic, setEpic] = useState('');
  const [part, setPart] = useState(String(booth));
  const [sno, setSno] = useState('');
  const [items, setItems] = useState<PollFound[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [marked, setMarked] = useState<Record<string, SaveHandle>>({});

  const ready = mode === 'epic' ? epic.trim().length >= 4 : Number(part) > 0 && Number(sno) > 0;
  const find = async () => {
    const mid = activeMembership()?.id;
    if (!mid || !ready) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await adminApi.pollFind(mid, mode === 'epic' ? { epic: epic.trim() } : { part: Number(part), sno: Number(sno) });
      setItems(r.items);
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
  const close = () => { setItems(null); setErr(null); onClose(); };

  return (
    <Sheet visible={visible} title={t('poll.find.title')} onClose={close} footer={t('poll.find.foot')}>
      <View style={s.form}>
        <SegmentedControl<'epic' | 'sno'> label={t('poll.find.by')} value={mode} onChange={(v) => { setMode(v); setItems(null); }}
          options={[{ value: 'epic', label: t('poll.find.epic') }, { value: 'sno', label: t('poll.find.boothSno') }]} />
        {mode === 'epic' ? (
          <Field label={t('poll.find.epicLabel')} value={epic} onChangeText={(x) => setEpic(x.toUpperCase().replace(/[^A-Z0-9/]/g, ''))}
            autoCapitalize="characters" autoCorrect={false} maxLength={20} returnKeyType="search" onSubmitEditing={() => void find()} />
        ) : (
          <View style={s.two}>
            <View style={s.flex}><Field label={t('poll.find.booth')} value={part} keyboardType="number-pad" onChangeText={(x) => setPart(x.replace(/\D/g, '').slice(0, 4))} /></View>
            <View style={s.flex}><Field label={t('poll.serial')} value={sno} keyboardType="number-pad" onChangeText={(x) => setSno(x.replace(/\D/g, '').slice(0, 4))}
              returnKeyType="search" onSubmitEditing={() => void find()} /></View>
          </View>
        )}
        {err ? <AppText variant="callout" color={colors.danger}>{err}</AppText> : null}
        <Button block label={t('poll.find.go')} disabled={!ready || busy} onPress={() => void find()} />
      </View>
      {items && !items.length ? <View style={s.form}><AppText variant="callout" color={colors.textSecondary}>{t('poll.find.none')}</AppText></View> : null}
      {(items ?? []).map((v) => {
        const done = v.voted || !!marked[v.id];
        return (
          <View key={v.id} style={s.item}>
            <AppText variant="headline">{v.name}</AppText>
            <AppText variant="callout" color={colors.textSecondary}>
              {`${t('common.booth', { no: v.part })} · S.No ${v.sno}${v.relative ? ` · ${v.relative}` : ''}${v.age ? ` · ${v.age}` : ''}`}
            </AppText>
            <AppText variant="footnote" color={colors.textSecondary} numberOfLines={1}>{v.boothName}{v.own ? '' : ` · ${t('poll.find.otherBooth')}`}</AppText>
            {marked[v.id] ? (
              <Button label={`${t('common.undo')} · ✓ ${t('poll.voted')}`} kind="tinted" onPress={() => undo(v)} />
            ) : done ? (
              <AppText variant="callout" weight="semibold" color={colors.success}>{`✓ ${t('poll.find.already')}`}</AppText>
            ) : (
              <Button kind="success" label={`✓ ${t('poll.voted')}`} onPress={() => mark(v)} a11yLabel={`${t('poll.markA11y')} ${v.name}`} />
            )}
          </View>
        );
      })}
      <Row title={t('poll.find.byName')} chevron onPress={() => { close(); onSearchName(); }} last />
    </Sheet>
  );
}

const s = StyleSheet.create({
  form: { padding: spacing.lg, gap: spacing.md },
  two: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  item: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
});
