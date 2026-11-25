/**
 * spec admin-fixes-r1 A1: Search voter. Any voter of the admin's assembly by EPIC, or by name (3+ letters) with an
 * optional address (house number or locality) and age (±2 years). Tapping a result opens that booth's voter list with
 * the voter's card open; Back returns here with the results kept.
 */
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/api/adminApi';
import type { Voter } from '@/api/types';
import { AppText, Button, Field, Icon, LargeTitle, Screen, SegmentedControl } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, easy, group, spacing } from '@/design/tokens';
import { loadErrorText } from '@/features/common/QueryState';
import { relText } from '@/features/voters/rel';
import { useActiveMembership } from '@/stores/session';

type By = 'epic' | 'name';

export default function SearchVoter() {
  const { t } = useTranslation();
  const m = useActiveMembership();
  const mid = m?.id ?? '';
  const [by, setBy] = useState<By>('epic');
  const [epic, setEpic] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [age, setAge] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const q = useMutation({ mutationFn: (f: Parameters<typeof adminApi.searchVoters>[1]) => adminApi.searchVoters(mid, f) });

  const go = () => {
    setHint(null);
    if (by === 'epic') {
      const e = epic.replace(/\s/g, '').toUpperCase();
      if (e.length < 4) { setHint(t('asearch.epicShort')); return; }
      q.mutate({ epic: e });
    } else {
      if (name.trim().length < 3) { setHint(t('asearch.short')); return; }
      const a = Number(age);
      q.mutate({ name: name.trim(), address: address.trim() || undefined, age: Number.isInteger(a) && a >= 18 && a <= 125 ? a : undefined });
    }
  };
  const open = (v: Voter) => router.push({ pathname: '/admin/avoters', params: { booth: String(v.booth), q: v.epic, open: v.id, from: t('asearch.title') } });

  return (
    <Screen back={t('admin.tabs.dashboard')} width="narrow">
      <LargeTitle title={t('asearch.title')} subtitle={m ? `${t('asearch.sub')} · ${t('admin.acTitle', { no: m.acNo, name: m.acName })}` : undefined} />
      <View style={s.form}>
        <SegmentedControl<By> value={by} onChange={(v) => { setBy(v); setHint(null); q.reset(); }}
          options={[{ value: 'epic', label: t('asearch.byEpic') }, { value: 'name', label: t('asearch.byName') }]} />
        {by === 'epic' ? (
          <Field label={t('asearch.epic')} value={epic} onChangeText={setEpic} placeholder={t('asearch.epicPh')} autoCapitalize="characters" autoCorrect={false}
            returnKeyType="search" onSubmitEditing={go} />
        ) : (
          <>
            <Field label={t('asearch.name')} value={name} onChangeText={setName} placeholder={t('asearch.namePh')} autoCorrect={false} returnKeyType="search" onSubmitEditing={go} />
            <Field label={t('asearch.address')} value={address} onChangeText={setAddress} placeholder={t('asearch.addressPh')} autoCorrect={false} returnKeyType="search" onSubmitEditing={go} />
            <Field label={t('asearch.age')} value={age} onChangeText={(x) => setAge(x.replace(/\D/g, '').slice(0, 3))} placeholder={t('asearch.agePh')} keyboardType="number-pad" returnKeyType="search" onSubmitEditing={go} />
          </>
        )}
        {hint ? <AppText variant="footnote" color={colors.danger}>{hint}</AppText> : null}
        <Button block label={t('asearch.go')} icon={<Icon name="search" size={20} color={colors.textOnAccent} />} disabled={q.isPending || !mid} onPress={go} />
      </View>

      {q.isError ? <AppText variant="callout" color={colors.danger} align="center" style={s.msg}>{loadErrorText(t, q.error)}</AppText> : null}
      {q.data ? (
        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <AppText variant="callout" weight="bold" color={colors.textSecondary} style={s.pad}>
            {q.data.items.length ? t('asearch.count', { n: q.data.items.length }) : t('asearch.none')}
          </AppText>
          {q.data.more ? <AppText variant="footnote" color={colors.textSecondary} style={s.pad}>{t('asearch.more')}</AppText> : null}
          {q.data.items.map((v) => {
            const tone = group[v.group ?? 'none'];
            return (
              <Pressable key={v.id} accessibilityRole="button" accessibilityLabel={`${v.name}, EPIC ${v.epic}, ${t('asearch.line', { booth: v.booth, house: v.house || '—' })}`}
                onPress={() => open(v)} style={({ pressed }) => [s.card, { backgroundColor: tone.card, borderColor: tone.strong }, pressed && { opacity: 0.8 }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="headline">{v.name}</AppText>
                  {v.relative ? <AppText variant="footnote" color={colors.textSecondary}>{`${relText(t, v.relation)} ${v.relative}`}</AppText> : null}
                  <AppText variant="footnote" weight="semibold">{`EPIC ${v.epic} · ${v.age} · ${t(`voters.g.${v.gender}`)}`}</AppText>
                  <AppText variant="footnote" color={colors.textSecondary}>{[t('asearch.line', { booth: v.booth, house: v.house || '—' }), v.village].filter(Boolean).join(' · ')}</AppText>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.textSecondary} />
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </Screen>
  );
}

const s = themed(() => StyleSheet.create({
  form: { paddingHorizontal: spacing.lg, gap: spacing.md, marginTop: spacing.sm },
  pad: { paddingHorizontal: spacing.lg },
  msg: { padding: spacing.lg },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, padding: spacing.md, borderRadius: 16, borderWidth: 2, borderColor: easy.tileBorder },
}));
