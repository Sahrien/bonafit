import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_PATHS, apiUrl } from '../core/api-url';
import { configureHttpClientTesting } from '../core/http-testing';
import { MOCK_BONOS, MOCK_SERVICES } from '../core/mock-data';
import { ServicesHttpApi } from './services-http.service';

describe('ServicesHttpApi', () => {
  let api: ServicesHttpApi;
  let http: HttpTestingController;

  beforeEach(() => {
    http = configureHttpClientTesting();
    api = TestBed.inject(ServicesHttpApi);
  });

  afterEach(() => {
    http.verify();
  });

  it('GET /services', async () => {
    const pending = firstValueFrom(api.getServices());
    const req = http.expectOne({ method: 'GET', url: apiUrl(API_PATHS.services) });
    req.flush(MOCK_SERVICES);
    expect(await pending).toEqual(MOCK_SERVICES);
  });

  it('GET /services/:id', async () => {
    const pending = firstValueFrom(api.getService('svc-masaje'));
    const req = http.expectOne({
      method: 'GET',
      url: apiUrl(API_PATHS.services, 'svc-masaje'),
    });
    req.flush(MOCK_SERVICES[2]);
    expect((await pending).allowsSingleSession).toBeTrue();
  });

  it('PUT /services/:id maps the body', async () => {
    const payload = { ...MOCK_SERVICES[2], singleSessionPrice: 50 };
    const { id, ...write } = payload;
    const pending = firstValueFrom(api.updateService(id, write));
    const req = http.expectOne({
      method: 'PUT',
      url: apiUrl(API_PATHS.services, id),
    });
    expect(req.request.body).toEqual(write);
    req.flush(payload);
    expect((await pending).singleSessionPrice).toBe(50);
  });

  it('GET /bonos?serviceId=', async () => {
    const pending = firstValueFrom(api.getBonos('svc-ep'));
    const req = http.expectOne(
      (request) =>
        request.method === 'GET' &&
        request.url === apiUrl(API_PATHS.bonos) &&
        request.params.get('serviceId') === 'svc-ep',
    );
    req.flush(MOCK_BONOS.filter((row) => row.serviceId === 'svc-ep'));
    expect((await pending).every((row) => row.serviceId === 'svc-ep')).toBeTrue();
  });

  it('POST /bonos', async () => {
    const payload = {
      serviceId: 'svc-masaje',
      name: 'pack-3',
      description: 'sessions-3',
      sessionCount: 3,
      price: 120,
    };
    const pending = firstValueFrom(api.createBono(payload));
    const req = http.expectOne({ method: 'POST', url: apiUrl(API_PATHS.bonos) });
    expect(req.request.body).toEqual(payload);
    req.flush({ ...payload, id: 'bono-new' });
    expect((await pending).id).toBe('bono-new');
  });

  it('DELETE /bonos/:id', async () => {
    const pending = firstValueFrom(api.deleteBono('bono-ep-5'));
    const req = http.expectOne({
      method: 'DELETE',
      url: apiUrl(API_PATHS.bonos, 'bono-ep-5'),
    });
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expect(await pending).toBeNull();
  });
});
