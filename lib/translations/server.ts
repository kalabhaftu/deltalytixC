import enTranslations from './en'

// Simple English-only translation function
function getTranslation(key: string) {
  const keys = key.split('.');
  let value: any = enTranslations;
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  return value || key;
}

// Server function that returns the translation function
export function getI18n() {
  return getTranslation;
}

// Always returns 'en' since we only support English
export function getCurrentLocale() {
  return 'en';
}