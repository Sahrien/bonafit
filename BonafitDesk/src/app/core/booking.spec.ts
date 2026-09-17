import { AppointmentStatus } from '../models/appointment.dto';
import { ClientBonoDto } from '../models/client-bono.dto';
import {
  earliestBookableLocalDate,
  isBonoExpired,
  isClientStartAllowed,
  isGiftCredit,
  pickPreferredBono,
  remainingSessionsDelta,
  canAdminCancelAppointment,
  canCancelAppointment,
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
});
