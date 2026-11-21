/**
 * Language setting (spec onboarding-branding OB6): an iOS settings row showing the current language; tapping opens a
 * list with a checkmark. After sign-in this is the only place to change the language.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChoiceRow, IconSquare, Row, Sheet } from '@/design/components';
import { colors } from '@/design/tokens';
import { initI18n, LANG_LABEL, type Lang } from '@/i18n';
import { usePrefs } from '@/stores/prefs';

/** `langs`: the languages this person may use (the customer's, or all for the super-admin). */
export function LanguageRow({ langs, last = true }: { langs: Lang[]; last?: boolean }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = i18n.language as Lang;
  const pick = (l: Lang) => {
    usePrefs.getState().setLang(l);
    void initI18n(l);
    setOpen(false);
  };
  return (
    <>
      <Row
        title={t('me.language')}
        value={LANG_LABEL[current] ?? current}
        leading={<IconSquare name="globe" bg={colors.accent} />}
        chevron
        onPress={langs.length > 1 ? () => setOpen(true) : undefined}
        last={last}
      />
      <Sheet visible={open} title={t('me.language')} onClose={() => setOpen(false)} footer={t('lang.changeLater')}>
        {langs.map((l, i) => (
          <ChoiceRow key={l} title={LANG_LABEL[l]} selected={current === l} onPress={() => pick(l)} last={i === langs.length - 1} />
        ))}
      </Sheet>
    </>
  );
}
