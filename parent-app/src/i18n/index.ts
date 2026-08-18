import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';

import mn from './locales/mn.json';
import en from './locales/en.json';

const LANGUAGE_KEY = 'app_language';
const SUPPORTED_LANGUAGES = ['mn', 'en'] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Default language is Mongolian (primary market). English is offered via the language toggle
 * on the Login/Register screens and in Settings; the choice is persisted.
 * `getLocales` is kept only for diagnostics/future use.
 */
const DEFAULT_LANGUAGE: SupportedLanguage = 'mn';
const getDeviceLanguage = (): SupportedLanguage => {
  try {
    void getLocales();
  } catch {
    // ignore
  }
  return DEFAULT_LANGUAGE;
};

const resources = {
  mn: { translation: mn },
  en: { translation: en },
};

const initI18n = async () => {
  let savedLang: string | null = null;
  try {
    savedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
  } catch {
    // ignore
  }

  // Stored preference wins; otherwise Mongolian by default.
  // Users can switch language on the login screen or in Settings.
  const lng = savedLang && (SUPPORTED_LANGUAGES as readonly string[]).includes(savedLang)
    ? savedLang
    : getDeviceLanguage();

  await i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v4',
  });
};

export const changeLanguage = async (lang: string) => {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
};

export { initI18n };
export default i18n;
