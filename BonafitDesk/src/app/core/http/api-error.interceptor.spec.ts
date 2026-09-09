import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApiBusinessError, BOOKING_ERROR_CODES } from '../api-business.error';
import { ApiNotFoundError } from '../api-not-found.error';
import { AuthTokenStore } from '../auth/auth-token.store';
import { AUTH_PATHS } from '../auth/auth.paths';
import { apiErrorInterceptor } from './api-error.interceptor';
import { authTokenInterceptor } from './auth-token.interceptor';

describe('HTTP interceptors', () => {
  let tokens: AuthTokenStore;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    tokens = TestBed.inject(AuthTokenStore);
    tokens.clear();
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');
  });

  afterEach(() => {
    tokens.clear();
  });

  it('attaches a bearer token when one is stored', () => {
    tokens.set('abc');
    const req = new HttpRequest('GET', '/clients');
    TestBed.runInInjectionContext(() => {
      authTokenInterceptor(req, (next) => {
        expect(next.headers.get('Authorization')).toBe('Bearer abc');
        return of(new HttpResponse({ status: 200 }));
      }).subscribe();
    });
  });

  it('maps 409 business codes', (done) => {
    const req = new HttpRequest('POST', '/appointments', {});
    TestBed.runInInjectionContext(() => {
      apiErrorInterceptor(req, () =>
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { code: BOOKING_ERROR_CODES.slotTaken },
            }),
        ),
      ).subscribe({
        error: (error) => {
          expect(error).toBeInstanceOf(ApiBusinessError);
          expect((error as ApiBusinessError).code).toBe(BOOKING_ERROR_CODES.slotTaken);
          done();
        },
      });
    });
  });

  it('maps 404 resource payloads', (done) => {
    const req = new HttpRequest('GET', '/clients/missing');
    TestBed.runInInjectionContext(() => {
      apiErrorInterceptor(req, () =>
        throwError(
          () =>
            new HttpErrorResponse({
              status: 404,
              error: { resource: 'client', id: 'missing', code: 'client.notFound' },
            }),
        ),
      ).subscribe({
        error: (error) => {
          expect(error).toBeInstanceOf(ApiNotFoundError);
          done();
        },
      });
    });
  });

  it('clears the session on 401', (done) => {
    tokens.set('abc');
    const req = new HttpRequest('GET', '/clients');
    TestBed.runInInjectionContext(() => {
      apiErrorInterceptor(req, () =>
        throwError(() => new HttpErrorResponse({ status: 401, error: { detail: 'unauthorized' } })),
      ).subscribe({
        error: () => {
          expect(tokens.get()).toBeNull();
          expect(router.navigateByUrl).toHaveBeenCalledWith(AUTH_PATHS.login);
          done();
        },
      });
    });
  });
});
