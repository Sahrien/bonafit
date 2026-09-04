import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_PATHS, apiUrl } from '../core/api-url';
import { configureHttpClientTesting } from '../core/http-testing';
import { MOCK_APPOINTMENTS, MOCK_TRAINERS } from '../core/mock-data';
import { CalendarHttpApi } from './calendar-http.service';

describe('CalendarHttpApi', () => {
  let api: CalendarHttpApi;
  let http: HttpTestingController;

  beforeEach(() => {
    http = configureHttpClientTesting();
    api = TestBed.inject(CalendarHttpApi);
  });

  afterEach(() => {
    http.verify();
  });

  it('GET /trainers', async () => {
    const pending = firstValueFrom(api.getTrainers());
    http
      .expectOne({ method: 'GET', url: apiUrl(API_PATHS.trainers) })
      .flush(MOCK_TRAINERS);
    expect(await pending).toEqual(MOCK_TRAINERS);
  });

  it('GET /trainers/:id', async () => {
    const pending = firstValueFrom(api.getTrainer('trainer-1'));
    http
      .expectOne({ method: 'GET', url: apiUrl(API_PATHS.trainers, 'trainer-1') })
      .flush(MOCK_TRAINERS[0]);
    expect(await pending).toEqual(MOCK_TRAINERS[0]);
  });

  it('GET /appointments with query params', async () => {
    const pending = firstValueFrom(
      api.getAppointments({ trainerId: 'trainer-1', from: '2026-09-07T00:00:00.000Z' }),
    );
    const req = http.expectOne(
      (request) =>
        request.method === 'GET' &&
        request.url === apiUrl(API_PATHS.appointments) &&
        request.params.get('trainerId') === 'trainer-1' &&
        request.params.get('from') === '2026-09-07T00:00:00.000Z',
    );
    req.flush(MOCK_APPOINTMENTS.filter((row) => row.trainerId === 'trainer-1'));
    expect((await pending).every((row) => row.trainerId === 'trainer-1')).toBeTrue();
  });

  it('POST /appointments', async () => {
    const payload = {
      trainerId: 'trainer-2',
      clientId: 'client-3',
      serviceId: 'svc-masaje',
      startsAt: '2026-09-09T11:00:00.000Z',
      endsAt: '2026-09-09T12:00:00.000Z',
      location: 'studio-2',
    };
    const pending = firstValueFrom(api.createAppointment(payload));
    const req = http.expectOne({
      method: 'POST',
      url: apiUrl(API_PATHS.appointments),
    });
    expect(req.request.body).toEqual(payload);
    req.flush({ ...payload, id: 'apt-9' });
    expect((await pending).id).toBe('apt-9');
  });

  it('PUT /appointments/:id', async () => {
    const { id, ...write } = MOCK_APPOINTMENTS[0];
    const pending = firstValueFrom(
      api.updateAppointment(id, { ...write, location: 'studio-2' }),
    );
    const req = http.expectOne({
      method: 'PUT',
      url: apiUrl(API_PATHS.appointments, id),
    });
    expect(req.request.body.location).toBe('studio-2');
    req.flush({ ...write, id, location: 'studio-2' });
    expect((await pending).location).toBe('studio-2');
  });

  it('DELETE /appointments/:id', async () => {
    const pending = firstValueFrom(api.deleteAppointment('apt-1'));
    const req = http.expectOne({
      method: 'DELETE',
      url: apiUrl(API_PATHS.appointments, 'apt-1'),
    });
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expect(await pending).toBeNull();
  });
});
