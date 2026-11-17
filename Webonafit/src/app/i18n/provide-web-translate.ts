import { EnvironmentProviders, inject, makeEnvironmentProviders, provideAppInitializer } from '@angular/core';
import { TranslateLoader, TranslateService, provideTranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { BundledTranslateLoader } from './bundled-translate.loader';
import { DEFAULT_LANGUAGE } from './language.service';

/**
 * Loads the bundled copy before bootstrap. This is the only place the default
 * bundle is requested; `LanguageService` only switches language afterwards.
 */
export function provideWebTranslate(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideTranslateService({
      defaultLanguage: DEFAULT_LANGUAGE,
      useDefaultLang: true,
      loader: { provide: TranslateLoader, useClass: BundledTranslateLoader },
    }),
    provideAppInitializer(() => {
      const translate = inject(TranslateService);
      return firstValueFrom(translate.use(DEFAULT_LANGUAGE));
    }),
  ]);
}
