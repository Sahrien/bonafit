import { EnvironmentProviders, inject, makeEnvironmentProviders, provideAppInitializer } from '@angular/core';
import { TranslateLoader, TranslateService, provideTranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { BundledTranslateLoader } from './bundled-translate.loader';

export function provideWebTranslate(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideTranslateService({
      defaultLanguage: 'es',
      useDefaultLang: true,
      loader: { provide: TranslateLoader, useClass: BundledTranslateLoader },
    }),
    provideAppInitializer(() => {
      const translate = inject(TranslateService);
      translate.setDefaultLang('es');
      return firstValueFrom(translate.use('es'));
    }),
  ]);
}
