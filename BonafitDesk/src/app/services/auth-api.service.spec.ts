import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_PATHS, apiUrl } from '../core/api-url';
import { AuthTokenStore } from '../core/auth/auth-token.store';
import { configureHttpClientTesting } from '../core/http-testing';
import { MOCK_ACCOUNTS, createMockSession } from '../testing/fixtures';
import { AuthApiService } from './auth-api.service';

describe('AuthApiService', () => {
  let api: AuthApiService;
  let http: HttpTestingController;
  let tokens: AuthTokenStore;

  beforeEach(() => {
    http = configureHttpClientTesting();
    api = TestBed.inject(AuthApiService);
    tokens = TestBed.inject(AuthTokenStore);
  });

  afterEach(() => {
    http.verify();
    tokens.clear();
  });

  it('POST /auth/login stores the token', async () => {
    const session = createMockSession(MOCK_ACCOUNTS[0]);
    const pending = firstValueFrom(
      api.login({ email: 'lucia@bonafit.com', password: 'secret' }),
    );
    const req = http.expectOne({ method: 'POST', url: apiUrl(API_PATHS.authLogin) });
    expect(req.request.body).toEqual({
      email: 'lucia@bonafit.com',
      password: 'secret',
    });
    req.flush(session);
    expect(await pending).toEqual(session);
    expect(tokens.get()).toBe(session.token);
  });

  it('POST /auth/logout clears the token', async () => {
    tokens.set('keep');
    const pending = firstValueFrom(api.logout());
    http.expectOne({ method: 'POST', url: apiUrl(API_PATHS.authLogout) }).flush(null);
    expect(await pending).toBeUndefined();
    expect(tokens.get()).toBeNull();
  });

  it('GET /auth/me returns null when there is no token', async () => {
    expect(await firstValueFrom(api.getSession())).toBeNull();
    http.expectNone(apiUrl(API_PATHS.authMe));
  });

  it('GET /auth/me merges the stored token', async () => {
    const session = createMockSession(MOCK_ACCOUNTS[2]);
    tokens.set(session.token);
    const pending = firstValueFrom(api.getSession());
    http.expectOne({ method: 'GET', url: apiUrl(API_PATHS.authMe) }).flush({
      user: session.user,
      token: '',
    });
    expect(await pending).toEqual(session);
  });

  it('POST /auth/change-password', async () => {
    const pending = firstValueFrom(
      api.changePassword({ currentPassword: 'old-pass1', newPassword: 'new-pass1' }),
    );
    const req = http.expectOne({ method: 'POST', url: apiUrl(API_PATHS.authChangePassword) });
    expect(req.request.body).toEqual({
      currentPassword: 'old-pass1',
      newPassword: 'new-pass1',
    });
    req.flush({ ok: true });
    await pending;
  });
});
