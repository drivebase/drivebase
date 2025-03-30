import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import Cookies from 'js-cookie';
import { initReactI18next } from 'react-i18next';

export const SUPPORTED_LANGUAGES = ['en', 'ar', 'es', 'id', 'zh', 'hi'] as const;

export const i18nInstance = i18n.use(Backend).use(LanguageDetector).use(initReactI18next);

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
  react: {
    useSuspense: false,
  },
  initImmediate: false,
  lng: Cookies.get('language') || 'en',
});

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  if (isLanguageRTL(lng)) {
    document.documentElement.dir = 'rtl';
  } else {
    document.documentElement.dir = 'ltr';
  }
});

export function isLanguageRTL(lang: string): boolean {
  return lang === 'ar';
}

export default i18n;
