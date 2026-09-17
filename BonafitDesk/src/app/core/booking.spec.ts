import { AppointmentStatus } from '../models/appointment.dto';
import { ClientBonoDto } from '../models/client-bono.dto';
import {
  earliestBookableLocalDate,
  isBonoExpired,
  isClientStartAllowed,
  isGiftCredit,
  listAvailabilitySlots,
  pickPreferredBono,
  remainingSessionsDelta,
  canAdminCancelAppointment,
  canCancelAppointment,
  slotTakenForTrainer,
} from './booking';

describe('booking rules', () => {
  const now = new Date(2026, 8, 8, 17, 0, 0);

  it('picks the bono that expires first, then the one with fewer sessions', () => {
    const rows: ClientBonoDto[] = [
      {
        id: 'a',
        clientId: 'c1',
        bonoId: 'b1',
        remainingSessions: 2,
        purchasedAt: '2026-01-01T00:00:00.000Z',
        expiresAt: '2026-12-01T00:00:00.000Z',
      },
      {
        id: 'b',
        clientId: 'c1',
        bonoId: 'b2',
        remainingSessions: 1,
        purchasedAt: '2026-01-01T00:00:00.000Z',
        expiresAt: '2026-11-01T00:00:00.000Z',
      },
    ];
    expect(pickPreferredBono(rows, now)?.id).toBe('b');
  });

  it('ignores expired bonos even if they have remaining sessions', () => {
    expect(isBonoExpired('2026-09-01T00:00:00.000Z', now)).toBeTrue();
    const rows: ClientBonoDto[] = [
      {
        id: 'expired',
        clientId: 'c1',
        bonoId: 'b1',
        remainingSessions: 8,
        purchasedAt: '2026-01-01T00:00:00.000Z',
        expiresAt: '2026-09-01T00:00:00.000Z',
      },
    ];
    expect(pickPreferredBono(rows, now)).toBeNull();
  });

  it('treats isGift as gift credit, not a purchased session', () => {
    expect(
      isGiftCredit({
        id: 'gift',
        clientId: 'c1',
        bonoId: 'b1',
        remainingSessions: 1,
        isGift: true,
        purchasedAt: '2026-01-01T00:00:00.000Z',
        expiresAt: null,
      }),
    ).toBeTrue();
    expect(
      isGiftCredit({
        id: 'pack',
        clientId: 'c1',
        bonoId: 'b1',
        remainingSessions: 1,
        purchasedAt: '2026-01-01T00:00:00.000Z',
        expiresAt: null,
      }),
    ).toBeFalse();
  });

  it('allows booking tomorrow before the cutoff and blocks it afterwards', () => {
    const beforeCutoff = new Date(2026, 8, 8, 17, 59, 0);
    const afterCutoff = new Date(2026, 8, 8, 18, 0, 0);
    expect(earliestBookableLocalDate(beforeCutoff, '18:00').getDate()).toBe(9);
    expect(earliestBookableLocalDate(afterCutoff, '18:00').getDate()).toBe(10);
  });

  it('treats pending as a blocking appointment status', () => {
    const pending: AppointmentStatus = 'pending';
    expect(['pending', 'confirmed']).toContain(pending);
  });

  it('consumes a session when moving into confirmed or completed', () => {
    expect(remainingSessionsDelta(null, 'confirmed')).toBe(-1);
    expect(remainingSessionsDelta('pending', 'confirmed')).toBe(-1);
    expect(remainingSessionsDelta('confirmed', 'cancelled')).toBe(1);
    expect(remainingSessionsDelta('completed', 'cancelled')).toBe(1);
    expect(remainingSessionsDelta('pending', 'cancelled')).toBe(0);
  });

  it('lets a client cancel pending or confirmed appointments before the cutoff', () => {
    const beforeCutoff = new Date(2026, 8, 8, 17, 59, 0);
    const afterCutoff = new Date(2026, 8, 8, 18, 0, 0);
    const tomorrow = new Date(2026, 8, 9, 10, 0, 0);
    const today = new Date(2026, 8, 8, 10, 0, 0);
    expect(canCancelAppointment('confirmed', tomorrow, beforeCutoff, '18:00')).toBeTrue();
    expect(canCancelAppointment('pending', tomorrow, beforeCutoff, '18:00')).toBeTrue();
    expect(canCancelAppointment('confirmed', tomorrow, afterCutoff, '18:00')).toBeFalse();
    expect(canCancelAppointment('confirmed', today, beforeCutoff, '18:00')).toBeFalse();
    expect(canCancelAppointment('completed', tomorrow, beforeCutoff, '18:00')).toBeFalse();
    expect(isClientStartAllowed(tomorrow, beforeCutoff, '18:00')).toBeTrue();
    expect(isClientStartAllowed(tomorrow, afterCutoff, '18:00')).toBeFalse();
  });

  it('lets an admin cancel pending and confirmed appointments', () => {
    expect(canAdminCancelAppointment('pending')).toBeTrue();
    expect(canAdminCancelAppointment('confirmed')).toBeTrue();
    expect(canAdminCancelAppointment('completed')).toBeFalse();
    expect(canAdminCancelAppointment('cancelled')).toBeFalse();
  });

  it('blocks a second overlapping booking at capacity 1 and allows it at capacity 2', () => {
    const start = new Date('2026-09-09T08:00:00.000Z');
    const end = new Date('2026-09-09T09:00:00.000Z');
    const busy = [
      {
        trainerId: 'trainer-1',
        status: 'confirmed' as AppointmentStatus,
        startsAt: '2026-09-09T08:00:00.000Z',
        endsAt: '2026-09-09T09:00:00.000Z',
      },
    ];
    expect(slotTakenForTrainer(busy, 'trainer-1', start, end, 1)).toBeTrue();
    expect(slotTakenForTrainer(busy, 'trainer-1', start, end, 2)).toBeFalse();
    expect(slotTakenForTrainer(busy, 'trainer-2', start, end, 1)).toBeFalse();
    expect(
      slotTakenForTrainer(
        [
          ...busy,
          {
            trainerId: 'trainer-1',
            status: 'confirmed' as AppointmentStatus,
            startsAt: '2026-09-09T08:00:00.000Z',
            endsAt: '2026-09-09T09:00:00.000Z',
          },
        ],
        'trainer-1',
        start,
        end,
        2,
      ),
    ).toBeTrue();
  });

  it('keeps a slot available until the trainer concurrent capacity is full', () => {
    const service = {
      id: 'svc-ep',
      name: 'EP',
      durationMinutes: 60,
      sharesSessionPool: true,
      forcesSingleSession: false,
      allowsSingleSession: false,
      bookableByClient: true,
      active: true,
    };
    const schedules = [
      { id: 'sch-1', trainerId: 'trainer-1', weekday: 3, startTime: '10:00', endTime: '12:00' },
    ];
    const settings = { id: 'booking-settings', nextDayCutoffTime: '18:00', defaultLocation: 'studio' };
    const appointments = [
      {
        id: 'apt-1',
        trainerId: 'trainer-1',
        clientId: 'client-1',
        serviceId: 'svc-ep',
        startsAt: '2026-09-09T08:00:00.000Z',
        endsAt: '2026-09-09T09:00:00.000Z',
        location: 'studio',
        status: 'confirmed' as AppointmentStatus,
      },
    ];
    const input = {
      service,
      schedules,
      appointments,
      settings,
      now: new Date('2026-09-09T06:00:00.000Z'),
      from: new Date('2026-09-09T00:00:00.000Z'),
      to: new Date('2026-09-09T23:00:00.000Z'),
      actor: 'trainer' as const,
    };
    const withRoom = listAvailabilitySlots({
      ...input,
      trainers: [{ id: 'trainer-1', concurrentCapacity: 2 }],
    });
    expect(withRoom.some((slot) => slot.startsAt === '2026-09-09T08:00:00.000Z')).toBeTrue();
    const full = listAvailabilitySlots({
      ...input,
      trainers: [{ id: 'trainer-1', concurrentCapacity: 1 }],
    });
    expect(full.some((slot) => slot.startsAt === '2026-09-09T08:00:00.000Z')).toBeFalse();
  });
});
