import { EnvironmentProviders, inject, makeEnvironmentProviders, provideAppInitializer } from '@angular/core';
import { TranslateLoader, TranslateService, provideTranslateService } from '@ngx-translate/core';
import { DEFAULT_LANGUAGE } from '../site';
import { BundledTranslateLoader } from './bundled-translate.loader';
import { LanguageService } from './language.service';

/**
 * Registers the bundled copy and loads the bundle for the URL being rendered.
 * Running this before bootstrap keeps SSR/prerender and hydration in the same
 * language.
 */
export function provideWebTranslate(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideTranslateService({
      defaultLanguage: DEFAULT_LANGUAGE,
      useDefaultLang: true,
      loader: { provide: TranslateLoader, useClass: BundledTranslateLoader },
    }),
    provideAppInitializer(() => inject(LanguageService).init()),
  ]);
}
