import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_PATHS, apiUrl } from '../core/api-url';
import { configureHttpClientTesting } from '../core/http-testing';
import { MOCK_ACCOUNTS, createMockSession } from '../core/mock-data';
import { AuthHttpApi } from './auth-http.service';

describe('AuthHttpApi', () => {
  let api: AuthHttpApi;
  let http: HttpTestingController;

  beforeEach(() => {
    http = configureHttpClientTesting();
    api = TestBed.inject(AuthHttpApi);
  });

  afterEach(() => {
    http.verify();
  });

  it('GET /auth/accounts', async () => {
    const pending = firstValueFrom(api.listAccounts());
    http
      .expectOne({ method: 'GET', url: apiUrl(API_PATHS.authAccounts) })
      .flush(MOCK_ACCOUNTS);
    expect(await pending).toEqual(MOCK_ACCOUNTS);
  });

  it('POST /auth/login', async () => {
    const session = createMockSession(MOCK_ACCOUNTS[0]);
    const pending = firstValueFrom(api.login('user-trainer-1'));
    const req = http.expectOne({ method: 'POST', url: apiUrl(API_PATHS.authLogin) });
    expect(req.request.body).toEqual({ userId: 'user-trainer-1' });
    req.flush(session);
    expect(await pending).toEqual(session);
  });

  it('POST /auth/logout', async () => {
    const pending = firstValueFrom(api.logout());
    const req = http.expectOne({ method: 'POST', url: apiUrl(API_PATHS.authLogout) });
    expect(req.request.method).toBe('POST');
    req.flush(null);
    expect(await pending).toBeNull();
  });

  it('GET /auth/me', async () => {
    const session = createMockSession(MOCK_ACCOUNTS[2]);
    const pending = firstValueFrom(api.getSession());
    http.expectOne({ method: 'GET', url: apiUrl(API_PATHS.authMe) }).flush(session);
    expect((await pending)?.user.role).toBe('client');
  });
});
