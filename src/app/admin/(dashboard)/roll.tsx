import { useTranslation } from 'react-i18next';
import { AppText, Group, LargeTitle, Row, Screen } from '@/design/components';
import { colors, spacing } from '@/design/tokens';
import { QueryState } from '@/features/common/QueryState';
import { rollLine, useRoll } from '@/features/admin/RollStrip';
import { showRegional } from '@/features/session/localize';
import { useActiveMembership } from '@/stores/session';

/** spec bilingual-roll U6: voters not in the latest roll — hidden from volunteers, history kept (trace still finds them). */
export default function RollScreen() {
  const { t, i18n } = useTranslation();
  const m = useActiveMembership();
  const q = useRoll(m?.id ?? '');
  const regional = showRegional(i18n.language, m?.dataLang);
  const r = q.data;
  return (
    <Screen width="medium" back={t('admin.tabs.dashboard')}>
      <LargeTitle title={t('roll.title')} subtitle={r ? rollLine(t, i18n.language, r.kind, r.publishedOn) ?? undefined : undefined} />
      {!r ? (
        <QueryState loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()} />
      ) : (
        <Group header={t('roll.notInRoll', { n: r.notInRoll })} footer={t('roll.notInRollHint')}>
          {r.notInRollList.length ? r.notInRollList.map((v, i, arr) => (
            <Row key={v.epic} title={(regional && v.nameLocal) || v.name} subtitle={`${t('common.booth', { no: v.booth })} · ${t('slip.sno')} ${v.sno} · ${v.epic}`} last={i === arr.length - 1} />
          )) : <AppText variant="callout" color={colors.textSecondary} style={{ padding: spacing.lg }}>{t('roll.none')}</AppText>}
        </Group>
      )}
    </Screen>
  );
}
