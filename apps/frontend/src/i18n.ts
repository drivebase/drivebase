import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// Create a promise that resolves when i18next is initialized
export const i18nInstance = i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next);

export const i18nPromise = i18nInstance.init({
  fallbackLng: {
    'en-IN': ['en'],
    default: ['en'],
  },
  load: 'languageOnly',
  ns: ['errors', 'common', 'dashboard', 'settings'],
  defaultNS: 'common',
  fallbackNS: 'common',
  interpolation: {
    escapeValue: false,
  },
  backend: {
    loadPath: '/locales/{{lng}}/{{ns}}.json',
  },
  detection: {
    order: ['querystring', 'navigator', 'htmlTag'],
    caches: ['localStorage'],
  },
});

export const SUPPORTED_LANGUAGES = ['en', 'ar', 'es', 'id', 'zh'] as const;

export default i18n;
