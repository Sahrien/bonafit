import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { BrandingService } from './branding/branding.service';
import { LanguageService } from './i18n/language.service';
import { provideWebTranslate } from './i18n/provide-web-translate';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(),
    provideWebTranslate(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      }),
    ),
    provideAppInitializer(() => inject(BrandingService).load()),
    provideAppInitializer(() => inject(LanguageService).init()),
  ],
};
