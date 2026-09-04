import { computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthApiService } from '../../services/auth-api.service';
import { AUTH_PATHS } from './auth.paths';

export function injectAuthSession() {
  const auth = inject(AuthApiService);
  const router = inject(Router);
  const session = toSignal(auth.getSession(), { initialValue: null });

  return {
    session,
    userName: computed(() => session()?.user.displayName ?? ''),
    logout(): void {
      auth.logout().subscribe(() => {
        void router.navigateByUrl(AUTH_PATHS.login);
      });
    },
    goAdminHome(): void {
      void router.navigateByUrl(AUTH_PATHS.admin);
    },
  };
}
