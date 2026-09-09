import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ApiBusinessError, BOOKING_ERROR_CODES } from '../api-business.error';
import { ApiNotFoundError } from '../api-not-found.error';
import { AUTH_PATHS } from '../auth/auth.paths';
import { AuthTokenStore } from '../auth/auth-token.store';

function isAuthLoginOrPassword(url: string): boolean {
  return url.includes('/auth/login') || url.includes('/auth/change-password');
}

export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(AuthTokenStore);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      const body = error.error as { code?: string; resource?: string; id?: string } | null;
      const code = typeof body?.code === 'string' ? body.code : '';
      const resource = body?.resource;
      const id = body?.id;

      if (error.status === 401 && !isAuthLoginOrPassword(req.url)) {
        tokens.clear();
        void router.navigateByUrl(AUTH_PATHS.login);
      }

      if (error.status === 403 && code === BOOKING_ERROR_CODES.mustChangePassword) {
        void router.navigateByUrl(AUTH_PATHS.changePassword);
        return throwError(() => new ApiBusinessError(code));
      }

      if (error.status === 409 && code) {
        return throwError(() => new ApiBusinessError(code));
      }

      if (error.status === 404 && typeof resource === 'string' && typeof id === 'string') {
        return throwError(() => new ApiNotFoundError(resource, id));
      }

      return throwError(() => error);
    }),
  );
};
