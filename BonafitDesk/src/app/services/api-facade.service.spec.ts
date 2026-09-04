import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { API_PATHS, apiUrl } from '../core/api-url';
import { MOCK_CLIENTS, MOCK_SERVICES, MOCK_TRAINERS } from '../core/mock-data';
import { MockStore } from '../core/mock-store.service';
import { AuthApiService } from './auth-api.service';
import { CalendarApiService } from './calendar-api.service';
import { ClientsApiService } from './clients-api.service';
import { ServicesApiService } from './services-api.service';

describe('API facades (mock vs HTTP)', () => {
  const originalUseMockApi = environment.useMockApi;

  afterEach(() => {
    environment.useMockApi = originalUseMockApi;
  });

  it('uses mock implementations when useMockApi is true', async () => {
    environment.useMockApi = true;
    TestBed.configureTestingModule({});
    TestBed.inject(MockStore).reset();

    const clients = TestBed.inject(ClientsApiService);
    const services = TestBed.inject(ServicesApiService);
    const calendar = TestBed.inject(CalendarApiService);
    const auth = TestBed.inject(AuthApiService);

    expect((await firstValueFrom(clients.getClients())).map((row) => row.id)).toEqual(
      MOCK_CLIENTS.map((row) => row.id),
    );
    expect((await firstValueFrom(services.getServices()))[2].allowsSingleSession).toBeTrue();
    expect(await firstValueFrom(calendar.getTrainers())).toEqual(MOCK_TRAINERS);
    expect((await firstValueFrom(auth.listAccounts())).some((row) => row.role === 'admin')).toBeTrue();
  });

  it('uses HTTP implementations when useMockApi is false', async () => {
    environment.useMockApi = false;
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const clients = TestBed.inject(ClientsApiService);
    const pending = firstValueFrom(clients.getClients());
    http.expectOne({ method: 'GET', url: apiUrl(API_PATHS.clients) }).flush(MOCK_CLIENTS);
    expect(await pending).toEqual(MOCK_CLIENTS);
    http.verify();
  });
});
