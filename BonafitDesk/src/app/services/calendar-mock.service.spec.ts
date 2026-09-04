import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { MOCK_APPOINTMENTS, MOCK_TRAINERS } from '../core/mock-data';
import { MockStore } from '../core/mock-store.service';
import { CalendarMockApi, filterAppointments } from './calendar-mock.service';

describe('CalendarMockApi', () => {
  let api: CalendarMockApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    TestBed.inject(MockStore).reset();
    api = TestBed.inject(CalendarMockApi);
  });

  it('lists two trainers', async () => {
    const trainers = await firstValueFrom(api.getTrainers());
    expect(trainers).toEqual(MOCK_TRAINERS);
  });

  it('filters appointments by trainer and time range', async () => {
    const rows = await firstValueFrom(
      api.getAppointments({
        trainerId: 'trainer-1',
        from: '2026-09-07T00:00:00.000Z',
        to: '2026-09-07T23:59:59.000Z',
      }),
    );
    expect(rows.every((row) => row.trainerId === 'trainer-1')).toBeTrue();
    expect(rows.map((row) => row.id)).toEqual(['apt-1']);
  });

  it('creates an appointment with location', async () => {
    const created = await firstValueFrom(
      api.createAppointment({
        trainerId: 'trainer-2',
        clientId: 'client-3',
        serviceId: 'svc-masaje',
        startsAt: '2026-09-09T11:00:00.000Z',
        endsAt: '2026-09-09T12:00:00.000Z',
        location: 'studio-2',
      }),
    );
    expect(created.location).toBe('studio-2');
    const listed = await firstValueFrom(api.getAppointments());
    expect(listed.some((row) => row.id === created.id)).toBeTrue();
  });
});

describe('filterAppointments', () => {
  it('filters by clientId', () => {
    const rows = filterAppointments(MOCK_APPOINTMENTS, { clientId: 'client-2' });
    expect(rows.map((row) => row.id)).toEqual(['apt-2']);
  });
});
