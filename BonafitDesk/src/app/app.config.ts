import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideBonaKit } from './components/bona-kit.providers';
import { routes } from './app.routes';
import { BrandThemeService } from './core/brand-theme.service';
import { provideDeskTranslate } from './core/i18n/provide-desk-translate';
import { LanguageService } from './core/i18n/language.service';
import { acceptLanguageInterceptor } from './core/http/accept-language.interceptor';
import { apiErrorInterceptor } from './core/http/api-error.interceptor';
import { authTokenInterceptor } from './core/http/auth-token.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([authTokenInterceptor, acceptLanguageInterceptor, apiErrorInterceptor]),
    ),
    provideDeskTranslate(),
    provideBonaKit(),
    provideAppInitializer(() => inject(BrandThemeService).load()),
    provideAppInitializer(() => inject(LanguageService).init()),
  ],
};

