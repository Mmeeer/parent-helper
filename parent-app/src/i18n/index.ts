import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';

import mn from './locales/mn.json';
import en from './locales/en.json';

const LANGUAGE_KEY = 'app_language';
const SUPPORTED_LANGUAGES = ['mn', 'en'] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** Pick the initial language from the device locale: Mongolian devices get 'mn', everyone else 'en'. */
const getDeviceLanguage = (): SupportedLanguage => {
  try {
    const code = getLocales()[0]?.languageCode?.toLowerCase();
    return code === 'mn' ? 'mn' : 'en';
  } catch {
    return 'en';
  }
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

  // Stored preference wins; otherwise follow the device locale.
  // Users can switch language at any time from Settings.
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
