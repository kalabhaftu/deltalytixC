"use client"
import enTranslations from './en'

// Simple English-only translation function with parameter substitution
function getTranslation(key: string, params?: Record<string, any>) {
  const keys = key.split('.');
  let value: any = enTranslations;
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  if (typeof value !== 'string') {
    return key;
  }
  
  // Handle parameter substitution
  if (params) {
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey] !== undefined ? String(params[paramKey]) : match;
    });
  }
  
  return value;
}

// Hook that returns the translation function
export function useI18n() {
  return getTranslation;
}

// Always returns 'en' since we only support English
export function useCurrentLocale() {
  return 'en';
}