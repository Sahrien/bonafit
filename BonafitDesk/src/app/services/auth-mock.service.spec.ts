import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ApiNotFoundError } from '../core/api-not-found.error';
import { MOCK_ACCOUNTS } from '../core/mock-data';
import { MockStore } from '../core/mock-store.service';
import { AuthMockApi } from './auth-mock.service';

describe('AuthMockApi', () => {
  let api: AuthMockApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    TestBed.inject(MockStore).reset();
    api = TestBed.inject(AuthMockApi);
  });

  it('lists admin and client accounts', async () => {
    const accounts = await firstValueFrom(api.listAccounts());
    expect(accounts.map((row) => row.id)).toEqual(MOCK_ACCOUNTS.map((row) => row.id));
    expect(accounts.filter((row) => row.role === 'admin')).toHaveSize(2);
    expect(accounts.filter((row) => row.role === 'client')).toHaveSize(1);
  });

  it('logs in an admin trainer and exposes the session', async () => {
    expect(await firstValueFrom(api.getSession())).toBeNull();
    const session = await firstValueFrom(api.login('user-trainer-1'));
    expect(session.user.role).toBe('admin');
    expect(session.user.trainerId).toBe('trainer-1');
    expect(session.token).toBe('mock-user-trainer-1');
    expect(await firstValueFrom(api.getSession())).toEqual(session);
  });

  it('logs in a client account', async () => {
    const session = await firstValueFrom(api.login('user-client-1'));
    expect(session.user.role).toBe('client');
    expect(session.user.clientId).toBe('client-1');
  });

  it('logs out and rejects unknown accounts', async () => {
    await firstValueFrom(api.login('user-trainer-2'));
    await firstValueFrom(api.logout());
    expect(await firstValueFrom(api.getSession())).toBeNull();
    await expectAsync(firstValueFrom(api.login('missing'))).toBeRejectedWith(
      jasmine.any(ApiNotFoundError),
    );
  });
});
