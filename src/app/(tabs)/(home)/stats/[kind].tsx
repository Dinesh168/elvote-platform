import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Group, LargeTitle, Row, Screen } from '@/design/components';
import { colors, group } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { useBooths, useVoters } from '@/features/data';
import { selectBoothStats, type BoothStats } from '@/features/stats/selectors';
import type { Preset } from '@/features/voters/filter';
import { usePrefs } from '@/stores/prefs';

type Tone = 'brand' | 'none' | 'our' | 'target' | 'opp';
type Line = { key: keyof BoothStats; of?: keyof BoothStats; tone: Tone; preset?: Preset; chip?: string };

const KINDS: Record<string, { title: string; lines: Line[] }> = {
  mobile: {
    title: 'stats.mobile',
    lines: [
      { key: 'withMobile', of: 'total', tone: 'brand', preset: 'withMobile' },
      { key: 'withoutMobile', of: 'total', tone: 'none', preset: 'withoutMobile' },
      { key: 'ourMobile', tone: 'our', preset: 'ourMobile' },
      { key: 'targetMobile', tone: 'target', preset: 'targetMobile' },
      { key: 'oppMobile', tone: 'opp', preset: 'oppMobile' },
    ],
  },
  houses: {
    title: 'stats.houses',
    lines: [
      { key: 'houses', tone: 'brand' },
      { key: 'ourHouses', of: 'houses', tone: 'our', chip: 'our' },
      { key: 'targetHouses', of: 'houses', tone: 'target', chip: 'target' },
      { key: 'oppHouses', of: 'houses', tone: 'opp', chip: 'opp' },
      { key: 'ourHousesMobile', tone: 'our', preset: 'ourMobile' },
      { key: 'targetHousesMobile', tone: 'target', preset: 'targetMobile' },
      { key: 'oppHousesMobile', tone: 'opp', preset: 'oppMobile' },
    ],
  },
  age: {
    title: 'stats.age',
    lines: [
      { key: 'ageFirst', of: 'total', tone: 'brand', preset: 'ageFirst' },
      { key: 'ageYoung', of: 'total', tone: 'brand', preset: 'ageYoung' },
      { key: 'ageMid', of: 'total', tone: 'brand', preset: 'ageMid' },
      { key: 'ageSenior', of: 'total', tone: 'brand', preset: 'ageSenior' },
    ],
  },
  gender: {
    title: 'stats.gender',
    lines: [
      { key: 'male', of: 'total', tone: 'brand', preset: 'male' },
      { key: 'female', of: 'total', tone: 'brand', preset: 'female' },
      { key: 'third', tone: 'none', preset: 'third' },
    ],
  },
};

const LABEL: Partial<Record<keyof BoothStats, string>> = { houses: 'stats.totalHouses' };
const dotColor = (tone: Tone) => (tone === 'brand' ? colors.accent : tone === 'none' ? colors.notMetDot : group[tone].strong);

export default function StatsDetail() {
  const { t } = useTranslation();
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const def = KINDS[kind ?? ''] ?? KINDS.mobile;
  const booth = usePrefs((s) => s.booth);
  const boothInfo = useBooths().data?.find((b) => b.no === booth);
  const q = useVoters(booth);
  const stats = useMemo(() => (q.data ? selectBoothStats(q.data, booth) : null), [q.data, booth]);

  return (
    <Screen back={t('tabs.home')}>
      <LargeTitle title={t(def.title)} subtitle={`${t('common.booth', { no: booth })} · ${boothInfo?.name ?? ''}`} />
      {!stats ? (
        <QueryState loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} />
      ) : (
        <Group footer={t('home.tapRow')}>
          {def.lines.map((l, i) => {
            const n = stats[l.key];
            const p = l.of ? `${Math.round((n / (stats[l.of] || 1)) * 100)}%` : '';
            const params: Record<string, string> = {};
            if (l.preset) params.preset = l.preset;
            if (l.chip) params.chip = l.chip;
            return (
              <Row
                key={l.key}
                title={t(LABEL[l.key] ?? `stats.${l.key}`)}
                value={p ? `${n.toLocaleString('en-IN')}  ·  ${p}` : n.toLocaleString('en-IN')}
                leading={<View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dotColor(l.tone) }} />}
                chevron
                last={i === def.lines.length - 1}
                onPress={() => router.push({ pathname: '/voters', params })}
              />
            );
          })}
        </Group>
      )}
    </Screen>
  );
}
