import { initI18n, i18n } from '@/i18n';
import { longDate } from './date';

it('formats the long date in English and Punjabi', async () => {
  await initI18n('en');
  expect(longDate(new Date(2026, 10, 18))).toBe('Wednesday, 18 November');
  await i18n.changeLanguage('pa');
  expect(longDate(new Date(2026, 10, 18))).toBe('ਬੁੱਧਵਾਰ, 18 ਨਵੰਬਰ');
  await i18n.changeLanguage('en');
});
