import { i18n } from '@/i18n';

/** "Tuesday, 18 November" in the current language (browsers lack Punjabi date formats). */
export function longDate(d: Date = new Date()): string {
  const days = i18n.t('date.days', { returnObjects: true }) as string[];
  const months = i18n.t('date.months', { returnObjects: true }) as string[];
  return i18n.t('date.long', { weekday: days[d.getDay()], day: d.getDate(), month: months[d.getMonth()] });
}
