import { EnvironmentProviders, inject, makeEnvironmentProviders, provideAppInitializer } from '@angular/core';
import { TranslateLoader, TranslateService, provideTranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { BundledTranslateLoader } from './bundled-translate.loader';
import { DEFAULT_UI_LANGUAGE } from './ui-language';

export function provideDeskTranslate(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideTranslateService({
      defaultLanguage: DEFAULT_UI_LANGUAGE,
      useDefaultLang: true,
      loader: { provide: TranslateLoader, useClass: BundledTranslateLoader },
    }),
    provideAppInitializer(() => {
      const translate = inject(TranslateService);
      translate.setDefaultLang(DEFAULT_UI_LANGUAGE);
      return firstValueFrom(translate.use(DEFAULT_UI_LANGUAGE));
    }),
  ]);
}
