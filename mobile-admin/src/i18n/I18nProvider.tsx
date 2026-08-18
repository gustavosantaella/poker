import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setCurrentLanguage, translate, TFunction } from './index';
import { Language } from './translations';

const STORAGE_KEY = 'pokelap.language';

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: TFunction;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/** Provee el idioma activo (default 'en'), persistido en AsyncStorage. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('es');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'en' || stored === 'es') {
          setLanguageState(stored);
          setCurrentLanguage(stored);
        }
      })
      .catch(() => undefined);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    setCurrentLanguage(lang);
    AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => undefined);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({ language, setLanguage, t: translate }),
    [language, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside <I18nProvider>');
  }
  return ctx;
}
