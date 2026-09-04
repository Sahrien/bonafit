import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { UserRole } from '../../models/auth-session.dto';
import { AuthApiService } from '../../services/auth-api.service';
import { AUTH_PATHS, homeForRole } from './auth.paths';

export const homeRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthApiService);
  const router = inject(Router);

  return auth.getSession().pipe(
    take(1),
    map((session) => {
      if (!session) {
        return router.createUrlTree([AUTH_PATHS.login]);
      }
      return router.createUrlTree([homeForRole(session.user.role)]);
    }),
  );
};

export const requireRole = (role: UserRole): CanActivateFn => {
  return () => {
    const auth = inject(AuthApiService);
    const router = inject(Router);

    return auth.getSession().pipe(
      take(1),
      map((session) => {
        if (!session) {
          return router.createUrlTree([AUTH_PATHS.login]);
        }
        if (session.user.role !== role) {
          return router.createUrlTree([homeForRole(session.user.role)]);
        }
        return true;
      }),
    );
  };
};

export const adminGuard = requireRole('admin');
export const clientGuard = requireRole('client');
