export class ApiBusinessError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = 'ApiBusinessError';
    this.code = code;
  }
}

export const BOOKING_ERROR_CODES = {
  cutoff: 'booking.cutoff',
  slotTaken: 'booking.slotTaken',
  oneAppointment: 'booking.oneAppointment',
  serviceNotBookable: 'booking.serviceNotBookable',
  bonoRequired: 'booking.bonoRequired',
  expiredBono: 'booking.expiredBono',
  noSessions: 'booking.noSessions',
  invalidStatus: 'booking.invalidStatus',
} as const;

export type BookingErrorCode = (typeof BOOKING_ERROR_CODES)[keyof typeof BOOKING_ERROR_CODES];
