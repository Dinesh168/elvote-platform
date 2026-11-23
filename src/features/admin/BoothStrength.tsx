/**
 * Booth strength on the booth page (spec real-demo-data B3): worked out from the last election for the team's party,
 * or set by the admin ("set by you") with Reset back to the worked-out value.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/api/adminApi';
import { AppText, Button, Group, SegmentedControl } from '@/design/components';
import { themed } from '@/design/theme';
import { colors, spacing } from '@/design/tokens';

export function BoothStrength({ mid, booth }: { mid: string; booth: number }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['boothTable', mid, ''], queryFn: () => adminApi.boothTable(mid), enabled: !!mid });
  const row = q.data?.find((b) => b.no === booth);
  if (!row) return null;
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['boothTable', mid] }), qc.invalidateQueries({ queryKey: ['dash', mid] })]);
  const set = async (v: 'S' | 'M' | 'W') => { await adminApi.setStrength(mid, booth, v); await refresh(); };
  const reset = async () => { await adminApi.resetStrength(mid, booth); await refresh(); };
  const auto = row.strengthSource !== 'admin';
  return (
    <Group header={t('admin.strength')} footer={auto ? t('bstr.auto') : t('bstr.admin')}>
      <View style={s.pad}>
        <SegmentedControl<'S' | 'M' | 'W'> label={t('admin.strength')} value={row.strength} onChange={(v) => void set(v)}
          options={[{ value: 'S', label: t('admin.strong') }, { value: 'M', label: t('admin.moderate') }, { value: 'W', label: t('admin.weak') }]} />
        <View style={s.line}>
          <AppText variant="footnote" weight="semibold" color={auto ? colors.successText : colors.warning}>{auto ? t('bstr.autoTag') : t('bstr.adminTag')}</AppText>
          {!auto ? <Button kind="plain" compact label={t('bstr.reset')} onPress={() => void reset()} /> : null}
        </View>
      </View>
    </Group>
  );
}

const s = themed(() => StyleSheet.create({
  pad: { padding: spacing.md, gap: spacing.sm },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
}));
