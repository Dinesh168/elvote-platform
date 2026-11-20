import { useTranslation } from 'react-i18next';
import { ChoiceRow, Sheet } from '@/design/components';
import { useBooths } from '@/features/data';
import { usePrefs } from '@/stores/prefs';

/** Choose booth (one booth at a time, spec V-GEN). */
export function BoothSheet({ visible, onClose, subtitleFor }: { visible: boolean; onClose: () => void; subtitleFor?: (no: number) => string | undefined }) {
  const { t } = useTranslation();
  const booths = useBooths().data ?? [];
  const booth = usePrefs((s) => s.booth);
  const setBooth = usePrefs((s) => s.setBooth);
  return (
    <Sheet visible={visible} title={t('common.chooseBooth')} onClose={onClose} footer={t('common.oneBooth')}>
      {booths.map((b, i) => (
        <ChoiceRow
          key={b.no}
          title={`${t('common.booth', { no: b.no })} · ${b.name}`}
          subtitle={subtitleFor?.(b.no)}
          selected={b.no === booth}
          last={i === booths.length - 1}
          onPress={() => {
            setBooth(b.no);
            onClose();
          }}
        />
      ))}
    </Sheet>
  );
}
