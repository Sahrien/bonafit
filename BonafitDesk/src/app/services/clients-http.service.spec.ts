import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_PATHS, apiUrl } from '../core/api-url';
import { configureHttpClientTesting } from '../core/http-testing';
import { MOCK_CLIENTS, MOCK_CLIENT_BONOS } from '../core/mock-data';
import { ClientWriteDto } from '../models/client.dto';
import { ClientsHttpApi } from './clients-http.service';

describe('ClientsHttpApi', () => {
  let api: ClientsHttpApi;
  let http: HttpTestingController;

  beforeEach(() => {
    http = configureHttpClientTesting();
    api = TestBed.inject(ClientsHttpApi);
  });

  afterEach(() => {
    http.verify();
  });

  it('GET /clients', async () => {
    const pending = firstValueFrom(api.getClients());
    const req = http.expectOne({ method: 'GET', url: apiUrl(API_PATHS.clients) });
    req.flush(MOCK_CLIENTS);
    expect(await pending).toEqual(MOCK_CLIENTS);
  });

  it('GET /clients/:id', async () => {
    const pending = firstValueFrom(api.getClient('client-1'));
    const req = http.expectOne({
      method: 'GET',
      url: apiUrl(API_PATHS.clients, 'client-1'),
    });
    req.flush(MOCK_CLIENTS[0]);
    expect(await pending).toEqual(MOCK_CLIENTS[0]);
  });

  it('POST /clients', async () => {
    const payload: ClientWriteDto = {
      firstName: 'Nia',
      lastName: 'Costa',
      email: 'nia.costa@example.com',
      phone: '+34000000009',
      notes: '',
    };
    const created = { ...payload, id: 'client-9' };
    const pending = firstValueFrom(api.createClient(payload));
    const req = http.expectOne({ method: 'POST', url: apiUrl(API_PATHS.clients) });
    expect(req.request.body).toEqual(payload);
    req.flush(created);
    expect(await pending).toEqual(created);
  });

  it('PUT /clients/:id', async () => {
    const payload: ClientWriteDto = {
      firstName: 'Marina',
      lastName: 'Lopez',
      email: 'marina.lopez@example.com',
      phone: '+34000000001',
      notes: 'updated',
    };
    const pending = firstValueFrom(api.updateClient('client-1', payload));
    const req = http.expectOne({
      method: 'PUT',
      url: apiUrl(API_PATHS.clients, 'client-1'),
    });
    expect(req.request.body).toEqual(payload);
    req.flush({ ...payload, id: 'client-1' });
    expect((await pending).notes).toBe('updated');
  });

  it('DELETE /clients/:id', async () => {
    const pending = firstValueFrom(api.deleteClient('client-1'));
    const req = http.expectOne({
      method: 'DELETE',
      url: apiUrl(API_PATHS.clients, 'client-1'),
    });
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expect(await pending).toBeNull();
  });

  it('GET /client-bonos?clientId=', async () => {
    const pending = firstValueFrom(api.getClientBonos('client-1'));
    const req = http.expectOne(
      (request) =>
        request.method === 'GET' &&
        request.url === apiUrl(API_PATHS.clientBonos) &&
        request.params.get('clientId') === 'client-1',
    );
    req.flush(MOCK_CLIENT_BONOS.filter((row) => row.clientId === 'client-1'));
    expect((await pending)[0].bonoId).toBe('bono-ep-10');
  });

  it('POST /client-bonos', async () => {
    const payload = { clientId: 'client-1', bonoId: 'bono-ep-5' };
    const pending = firstValueFrom(api.contractBono(payload));
    const req = http.expectOne({
      method: 'POST',
      url: apiUrl(API_PATHS.clientBonos),
    });
    expect(req.request.body).toEqual(payload);
    req.flush({
      id: 'cb-9',
      ...payload,
      remainingSessions: 5,
      purchasedAt: '2026-09-04T00:00:00.000Z',
      expiresAt: null,
    });
    expect((await pending).remainingSessions).toBe(5);
  });
});
