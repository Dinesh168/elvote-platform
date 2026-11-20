import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import pa from './pa.json';

export type Lang = 'en' | 'pa';
export const LANGS: Lang[] = ['pa', 'en'];

let ready: Promise<unknown> | null = null;

export function initI18n(lang: Lang = 'pa') {
  if (!ready) {
    ready = i18n.use(initReactI18next).init({
      resources: { en: { translation: en }, pa: { translation: pa } },
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
