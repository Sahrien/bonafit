import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ApiNotFoundError } from '../core/api-not-found.error';
import { MOCK_CLIENTS } from '../core/mock-data';
import { MockStore } from '../core/mock-store.service';
import { ClientWriteDto } from '../models/client.dto';
import { ClientsMockApi } from './clients-mock.service';

describe('ClientsMockApi', () => {
  let api: ClientsMockApi;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(MockStore);
    store.reset();
    api = TestBed.inject(ClientsMockApi);
  });

  it('lists seeded clients', async () => {
    const clients = await firstValueFrom(api.getClients());
    expect(clients.map((row) => row.id)).toEqual(MOCK_CLIENTS.map((row) => row.id));
  });

  it('returns a clone so callers cannot mutate the store', async () => {
    const clients = await firstValueFrom(api.getClients());
    clients[0].firstName = 'mutated';
    const again = await firstValueFrom(api.getClient('client-1'));
    expect(again.firstName).toBe('Marina');
  });

  it('creates, updates and deletes a client', async () => {
    const payload: ClientWriteDto = {
      firstName: 'Nia',
      lastName: 'Costa',
      email: 'nia.costa@example.com',
      phone: '+34000000009',
      notes: '',
    };
    const created = await firstValueFrom(api.createClient(payload));
    expect(created.id).toBeTruthy();
    expect(created.firstName).toBe('Nia');

    const updated = await firstValueFrom(
      api.updateClient(created.id, { ...payload, notes: 'ok' }),
    );
    expect(updated.notes).toBe('ok');

    await firstValueFrom(api.deleteClient(created.id));
    await expectAsync(firstValueFrom(api.getClient(created.id))).toBeRejectedWith(
      jasmine.any(ApiNotFoundError),
    );
  });

  it('lists client bonos and contracts a new one', async () => {
    const existing = await firstValueFrom(api.getClientBonos('client-1'));
    expect(existing).toHaveSize(1);
    expect(existing[0].bonoId).toBe('bono-ep-10');

    const contracted = await firstValueFrom(
      api.contractBono({ clientId: 'client-1', bonoId: 'bono-ep-5' }),
    );
    expect(contracted.remainingSessions).toBe(5);
    expect(contracted.clientId).toBe('client-1');
    const all = await firstValueFrom(api.getClientBonos('client-1'));
    expect(all).toHaveSize(2);
  });
});
