import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { firstValueFrom, isObservable, Observable, of } from 'rxjs';
import { AuthApiService } from '../../services/auth-api.service';
import { MOCK_ACCOUNTS, createMockSession } from '../../testing/fixtures';
import { adminGuard, authenticatedGuard, clientGuard, homeRedirectGuard } from './auth.guards';

describe('auth guards', () => {
  let auth: jasmine.SpyObj<AuthApiService>;
  let router: Router;

  beforeEach(() => {
    auth = jasmine.createSpyObj('AuthApiService', ['getSession']);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthApiService, useValue: auth }],
    });
    router = TestBed.inject(Router);
  });

  async function resultOf(guard: CanActivateFn): Promise<boolean | UrlTree> {
    const raw = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url: '/' } as RouterStateSnapshot),
    );
    if (isObservable(raw)) {
      return firstValueFrom(raw as Observable<boolean | UrlTree>);
    }
    return raw as boolean | UrlTree;
  }

  function urlOf(value: boolean | UrlTree): string | true {
    if (value === true) {
      return true;
    }
    if (value === false) {
      return '/blocked';
    }
    return router.serializeUrl(value);
  }

  it('sends an anonymous visitor to login', async () => {
    auth.getSession.and.returnValue(of(null));
    expect(urlOf(await resultOf(homeRedirectGuard))).toBe('/login');
    expect(urlOf(await resultOf(adminGuard))).toBe('/login');
    expect(urlOf(await resultOf(clientGuard))).toBe('/login');
    expect(urlOf(await resultOf(authenticatedGuard))).toBe('/login');
  });

  it('sends an admin to the admin home and blocks the client portal', async () => {
    auth.getSession.and.returnValue(of(createMockSession(MOCK_ACCOUNTS[0])));
    expect(urlOf(await resultOf(homeRedirectGuard))).toBe('/admin');
    expect(urlOf(await resultOf(adminGuard))).toBe(true);
    expect(urlOf(await resultOf(clientGuard))).toBe('/admin');
  });

  it('sends a client to the portal and blocks the admin panel', async () => {
    auth.getSession.and.returnValue(of(createMockSession(MOCK_ACCOUNTS[2])));
    expect(urlOf(await resultOf(homeRedirectGuard))).toBe('/app');
    expect(urlOf(await resultOf(clientGuard))).toBe(true);
    expect(urlOf(await resultOf(adminGuard))).toBe('/app');
  });

  it('forces a password change when the API requires it', async () => {
    auth.getSession.and.returnValue(
      of(createMockSession({ ...MOCK_ACCOUNTS[2], mustChangePassword: true })),
    );
    expect(urlOf(await resultOf(homeRedirectGuard))).toBe('/cambiar-clave');
    expect(urlOf(await resultOf(adminGuard))).toBe('/cambiar-clave');
    expect(urlOf(await resultOf(authenticatedGuard))).toBe(true);
  });
});
