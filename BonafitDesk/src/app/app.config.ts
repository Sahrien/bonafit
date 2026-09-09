import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideBonaKit } from './components/bona-kit.providers';
import { routes } from './app.routes';
import { apiErrorInterceptor } from './core/http/api-error.interceptor';
import { authTokenInterceptor } from './core/http/auth-token.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authTokenInterceptor, apiErrorInterceptor])),
    provideBonaKit(),
  ],
};

