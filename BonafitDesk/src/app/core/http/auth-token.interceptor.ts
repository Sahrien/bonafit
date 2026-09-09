import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthTokenStore } from '../auth/auth-token.store';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthTokenStore).get();
  if (!token || req.headers.has('Authorization')) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
