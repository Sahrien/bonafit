export type UiLanguage = 'es' | 'en';

export const UI_LANGUAGES: readonly UiLanguage[] = ['es', 'en'];
export const DEFAULT_UI_LANGUAGE: UiLanguage = 'es';
export const LANGUAGE_STORAGE_KEY = 'bonafit.language';

export function isUiLanguage(value: unknown): value is UiLanguage {
  return value === 'es' || value === 'en';
}

export function localeTag(language: UiLanguage): string {
  return language === 'en' ? 'en-GB' : 'es-ES';
}
