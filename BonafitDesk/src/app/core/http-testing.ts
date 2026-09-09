import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthTokenStore } from './auth/auth-token.store';
import { apiErrorInterceptor } from './http/api-error.interceptor';
import { authTokenInterceptor } from './http/auth-token.interceptor';

export function configureHttpClientTesting(): HttpTestingController {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([authTokenInterceptor, apiErrorInterceptor])),
      provideHttpClientTesting(),
      provideRouter([]),
    ],
  });
  TestBed.inject(AuthTokenStore).clear();
  return TestBed.inject(HttpTestingController);
}

