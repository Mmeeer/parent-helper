import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import mn from './locales/mn.json';
import en from './locales/en.json';

const LANGUAGE_KEY = 'app_language';
const DEFAULT_LANGUAGE = 'mn';

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

  // Mongolian is the default for first-time users regardless of device
  // locale. Users can switch to English from Settings.
  const lng = savedLang || DEFAULT_LANGUAGE;

  await i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: 'mn',
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
