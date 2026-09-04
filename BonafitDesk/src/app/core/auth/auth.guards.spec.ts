import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { firstValueFrom, isObservable, Observable } from 'rxjs';
import { AuthApiService } from '../../services/auth-api.service';
import { MockStore } from '../mock-store.service';
import { adminGuard, clientGuard, homeRedirectGuard } from './auth.guards';

describe('auth guards', () => {
  let auth: AuthApiService;
  let router: Router;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    store = TestBed.inject(MockStore);
    store.reset();
    auth = TestBed.inject(AuthApiService);
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
    expect(urlOf(await resultOf(homeRedirectGuard))).toBe('/login');
    expect(urlOf(await resultOf(adminGuard))).toBe('/login');
    expect(urlOf(await resultOf(clientGuard))).toBe('/login');
  });

  it('sends an admin to the admin home and blocks the client portal', async () => {
    await firstValueFrom(auth.login('user-trainer-1'));

    expect(urlOf(await resultOf(homeRedirectGuard))).toBe('/admin');
    expect(urlOf(await resultOf(adminGuard))).toBe(true);
    expect(urlOf(await resultOf(clientGuard))).toBe('/admin');
  });

  it('sends a client to the portal and blocks the admin panel', async () => {
    await firstValueFrom(auth.login('user-client-1'));

    expect(urlOf(await resultOf(homeRedirectGuard))).toBe('/app');
    expect(urlOf(await resultOf(clientGuard))).toBe(true);
    expect(urlOf(await resultOf(adminGuard))).toBe('/app');
  });
});
