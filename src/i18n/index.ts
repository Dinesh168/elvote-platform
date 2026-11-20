import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import hi from './hi.json';
import pa from './pa.json';

export type Lang = 'en' | 'hi' | 'pa';
export const LANGS: Lang[] = ['pa', 'hi', 'en'];
/** Each language in its own script (pickers). */
export const LANG_LABEL: Record<Lang, string> = { en: 'English', hi: 'हिन्दी', pa: 'ਪੰਜਾਬੀ' };
/** Short script mark for the compact switch. */
export const LANG_MARK: Record<Lang, string> = { en: 'A', hi: 'हि', pa: 'ਪੰ' };
export const isLang = (x: unknown): x is Lang => x === 'en' || x === 'hi' || x === 'pa';
/** Locale for dates and numbers. */
export const localeOf = (lang: string) => (lang === 'pa' ? 'pa-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN');

let ready: Promise<unknown> | null = null;

export function initI18n(lang: Lang = 'pa') {
  if (!ready) {
    ready = i18n.use(initReactI18next).init({
      resources: { en: { translation: en }, hi: { translation: hi }, pa: { translation: pa } },
      lng: lang,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      returnNull: false,
    });
    return ready;
  }
  return ready.then(() => i18n.changeLanguage(lang));
}

export { i18n };
