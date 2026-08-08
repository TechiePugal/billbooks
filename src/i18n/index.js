import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ta from './locales/ta.json';
import hi from './locales/hi.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'hi', label: 'हिन्दी' }
];

const STORAGE_KEY = 'foodbill-language';

function isSupported(code) {
  return SUPPORTED_LANGUAGES.some((l) => l.code === code);
}

/**
 * True only if this device has never had a language explicitly chosen on it
 * — used once, on first load, to adopt the shop's saved language from
 * Firestore without ever overriding a choice already made on this device.
 */
export function hasStoredLanguagePreference() {
  try {
    return isSupported(localStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
}

/**
 * Read the saved language synchronously, before the first render — so the
 * app boots directly into Tamil/Hindi rather than flashing English first
 * and switching a moment later.
 */
export function getStoredLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isSupported(stored) ? stored : 'en';
  } catch {
    // Private-browsing / storage-disabled — fall back to English rather than crash.
    return 'en';
  }
}

/**
 * Switches the whole app's language immediately. Callers that also want it
 * remembered across devices are responsible for persisting it to the shop's
 * settings in Firestore separately — this only handles the instant,
 * per-device UI switch.
 */
export function setAppLanguage(code) {
  const lang = isSupported(code) ? code : 'en';
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Language still changes for this session even if it can't be remembered.
  }
  i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ta: { translation: ta },
    hi: { translation: hi }
  },
  lng: getStoredLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes — double-escaping breaks the ₹ symbol context
  returnEmptyString: false
});

document.documentElement.lang = i18n.language;

export default i18n;
