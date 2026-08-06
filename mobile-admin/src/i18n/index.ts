import { translations, TranslationKey } from './translations';

export type { Language, TranslationKey } from './translations';

/** Almacen de idioma a nivel de modulo (util para modulos no-React como schemas/error.ts). */
let currentLanguage: keyof typeof translations = 'en';

export function setCurrentLanguage(language: keyof typeof translations): void {
  currentLanguage = language;
}

export function getCurrentLanguage(): keyof typeof translations {
  return currentLanguage;
}

export type TFunction = (key: TranslationKey, vars?: Record<string, string | number>) => string;

/** Traduce una clave al idioma actual, con fallback a ingles. */
export function translate(key: TranslationKey, vars?: Record<string, string | number>): string {
  const dictionary = translations[currentLanguage] ?? translations.en;
  const template = dictionary[key] ?? translations.en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    vars[name] !== undefined ? String(vars[name]) : match,
  );
}
