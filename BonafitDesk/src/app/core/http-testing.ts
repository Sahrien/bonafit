import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthTokenStore } from './auth/auth-token.store';
import { provideDeskTranslate } from './i18n/provide-desk-translate';
import { acceptLanguageInterceptor } from './http/accept-language.interceptor';
import { apiErrorInterceptor } from './http/api-error.interceptor';
import { authTokenInterceptor } from './http/auth-token.interceptor';

export function configureHttpClientTesting(): HttpTestingController {
  TestBed.configureTestingModule({
    providers: [
      provideDeskTranslate(),
      provideHttpClient(
        withInterceptors([authTokenInterceptor, acceptLanguageInterceptor, apiErrorInterceptor]),
      ),
      provideHttpClientTesting(),
      provideRouter([]),
    ],
  });
  TestBed.inject(AuthTokenStore).clear();
  return TestBed.inject(HttpTestingController);
}

