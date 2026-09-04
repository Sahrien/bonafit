import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { MOCK_BONOS, MOCK_SERVICES } from '../core/mock-data';
import { MockStore } from '../core/mock-store.service';
import { ServicesMockApi } from './services-mock.service';

describe('ServicesMockApi', () => {
  let api: ServicesMockApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    TestBed.inject(MockStore).reset();
    api = TestBed.inject(ServicesMockApi);
  });

  it('lists services with single-session flag as data', async () => {
    const services = await firstValueFrom(api.getServices());
    expect(services.map((row) => row.id)).toEqual(MOCK_SERVICES.map((row) => row.id));
    expect(services.find((row) => row.id === 'svc-ep')?.allowsSingleSession).toBeFalse();
    expect(services.find((row) => row.id === 'svc-masaje')?.singleSessionPrice).toBe(45);
  });

  it('filters bonos by serviceId', async () => {
    const epBonos = await firstValueFrom(api.getBonos('svc-ep'));
    expect(epBonos.every((row) => row.serviceId === 'svc-ep')).toBeTrue();
    expect(epBonos.length).toBe(
      MOCK_BONOS.filter((row) => row.serviceId === 'svc-ep').length,
    );
  });

  it('creates and deletes a bono', async () => {
    const created = await firstValueFrom(
      api.createBono({
        serviceId: 'svc-masaje',
        name: 'pack-3',
        description: 'sessions-3',
        sessionCount: 3,
        price: 120,
      }),
    );
    expect(created.sessionCount).toBe(3);
    await firstValueFrom(api.deleteBono(created.id));
    const remaining = await firstValueFrom(api.getBonos('svc-masaje'));
    expect(remaining.some((row) => row.id === created.id)).toBeFalse();
  });
});
