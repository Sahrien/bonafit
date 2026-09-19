import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_PATHS, apiUrl } from '../core/api-url';
import { configureHttpClientTesting } from '../core/http-testing';
import { MOCK_CLIENTS, MOCK_CLIENT_BONOS } from '../testing/fixtures';
import { ClientWriteDto } from '../models/client.dto';
import { ClientsApiService } from './clients-api.service';

describe('ClientsApiService', () => {
  let api: ClientsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    http = configureHttpClientTesting();
    api = TestBed.inject(ClientsApiService);
  });

  afterEach(() => {
    http.verify();
  });

  it('GET /clients', async () => {
    const pending = firstValueFrom(api.getClients());
    http.expectOne({ method: 'GET', url: apiUrl(API_PATHS.clients) }).flush(MOCK_CLIENTS);
    expect(await pending).toEqual(MOCK_CLIENTS);
  });

  it('GET /clients/:id', async () => {
    const pending = firstValueFrom(api.getClient('client-1'));
    http
      .expectOne({ method: 'GET', url: apiUrl(API_PATHS.clients, 'client-1') })
      .flush(MOCK_CLIENTS[0]);
    expect(await pending).toEqual(MOCK_CLIENTS[0]);
  });

  it('POST /clients', async () => {
    const payload: ClientWriteDto = {
      firstName: 'Nia',
      lastName: 'Costa',
      email: 'nia.costa@example.com',
      phone: '+34000000009',
      notes: '',
      instantConfirm: false,
    };
    const created = { ...payload, id: 'client-9', temporaryPassword: 'TempPass1' };
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
      instantConfirm: true,
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
    http.expectOne({ method: 'DELETE', url: apiUrl(API_PATHS.clients, 'client-1') }).flush(null);
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
    const req = http.expectOne({ method: 'POST', url: apiUrl(API_PATHS.clientBonos) });
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

  it('POST /client-bonos gifts a single session', async () => {
    const payload = { clientId: 'client-1', serviceId: 'svc-ep', remainingSessions: 1 };
    const pending = firstValueFrom(api.contractBono(payload));
    const req = http.expectOne({ method: 'POST', url: apiUrl(API_PATHS.clientBonos) });
    expect(req.request.body).toEqual(payload);
    req.flush({
      id: 'cb-gift',
      clientId: 'client-1',
      bonoId: 'bono-ep-10',
      remainingSessions: 1,
      purchasedAt: '2026-09-17T00:00:00.000Z',
      expiresAt: null,
    });
    expect((await pending).remainingSessions).toBe(1);
  });

  it('PUT /client-bonos/:id', async () => {
    const payload = { remainingSessions: 4, expiresAt: '2026-12-01T10:00:00.000Z' };
    const pending = firstValueFrom(api.updateClientBono('cb-1', payload));
    const req = http.expectOne({
      method: 'PUT',
      url: apiUrl(API_PATHS.clientBonos, 'cb-1'),
    });
    expect(req.request.body).toEqual(payload);
    req.flush({ ...MOCK_CLIENT_BONOS[0], remainingSessions: 4 });
    expect((await pending).remainingSessions).toBe(4);
  });

  it('DELETE /client-bonos/:id', async () => {
    const pending = firstValueFrom(api.deleteClientBono('cb-1'));
    http.expectOne({ method: 'DELETE', url: apiUrl(API_PATHS.clientBonos, 'cb-1') }).flush(null);
    expect(await pending).toBeNull();
  });

  it('GET /clients/:id/coupons', async () => {
    const pending = firstValueFrom(api.getCoupons('client-1'));
    http
      .expectOne({ method: 'GET', url: apiUrl(API_PATHS.clients, 'client-1', API_PATHS.clientCoupons) })
      .flush([]);
    expect(await pending).toEqual([]);
  });

  it('POST /clients/:id/coupons', async () => {
    const pending = firstValueFrom(api.createCoupon('client-1', { kind: 'percent', value: 10 }));
    const req = http.expectOne({
      method: 'POST',
      url: apiUrl(API_PATHS.clients, 'client-1', API_PATHS.clientCoupons),
    });
    expect(req.request.body).toEqual({ kind: 'percent', value: 10 });
    req.flush({ id: 'coupon-1', clientId: 'client-1', kind: 'percent', value: 10 });
    expect((await pending).id).toBe('coupon-1');
  });

  it('DELETE /clients/:id/coupons/:couponId', async () => {
    const pending = firstValueFrom(api.deleteCoupon('client-1', 'coupon-1'));
    http
      .expectOne({
        method: 'DELETE',
        url: apiUrl(API_PATHS.clients, 'client-1', API_PATHS.clientCoupons, 'coupon-1'),
      })
      .flush(null);
    expect(await pending).toBeNull();
  });
});
