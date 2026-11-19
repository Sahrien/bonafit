/** Static studio identity. Colors live in `styles.scss`, copy in `assets/i18n/`. */
export const SITE = {
  name: 'BonaFIT',
  slogan: 'Wellness & Longevity',
  /** Production origin, used for canonical URLs, hreflang and the sitemap. */
  url: 'https://bona-fit.es',
} as const;

export type UiLanguage = 'es' | 'en';

export const DEFAULT_LANGUAGE: UiLanguage = 'es';

/** Default language (Spanish) is unprefixed; English lives under `/en`. */
export const HOME_PATH: Record<UiLanguage, string> = {
  es: '/',
  en: '/en',
};

/** The contact section is an anchor on the home page, named per language. */
export const CONTACT_FRAGMENT: Record<UiLanguage, string> = {
  es: 'contacto',
  en: 'contact',
};

export type PageId = 'home' | 'notFound';
