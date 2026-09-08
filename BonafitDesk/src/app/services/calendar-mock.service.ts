import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { ApiBusinessError, BOOKING_ERROR_CODES } from '../core/api-business.error';
import { ApiNotFoundError } from '../core/api-not-found.error';
import {
  BookingActor,
  addMinutes,
  isActiveClientAppointment,
  isBonoUsable,
  listAvailabilitySlots,
  occupiesTrainerSlot,
  pickPreferredBono,
  remainingSessionsDelta,
  slotMatches,
  statusOnClientReschedule,
  statusOnCreate,
} from '../core/booking';
import { CalendarApi } from '../core/calendar-api';
import { MockStore } from '../core/mock-store.service';
import {
  AppointmentDto,
  AppointmentQuery,
  AppointmentWriteDto,
  AvailabilityQuery,
  AvailabilitySlotDto,
} from '../models/appointment.dto';
import { BookingSettingsDto, BookingSettingsWriteDto } from '../models/booking-settings.dto';
import { ClientBonoDto } from '../models/client-bono.dto';
import { TrainerScheduleDto, TrainerScheduleWriteDto } from '../models/trainer-schedule.dto';
import { TrainerDto } from '../models/trainer.dto';

@Injectable({ providedIn: 'root' })
export class CalendarMockApi implements CalendarApi {
  private readonly store = inject(MockStore);

  getTrainers(): Observable<TrainerDto[]> {
    return of(structuredClone(this.store.trainers));
  }

  getTrainer(id: string): Observable<TrainerDto> {
    const trainer = this.store.trainers.find((row) => row.id === id);
    if (!trainer) {
      return throwError(() => new ApiNotFoundError('trainer', id));
    }
    return of(structuredClone(trainer));
  }

  getAppointments(query?: AppointmentQuery): Observable<AppointmentDto[]> {
    return of(structuredClone(filterAppointments(this.store.appointments, query)));
  }

  getAppointment(id: string): Observable<AppointmentDto> {
    const appointment = this.store.appointments.find((row) => row.id === id);
    if (!appointment) {
      return throwError(() => new ApiNotFoundError('appointment', id));
    }
    return of(structuredClone(appointment));
  }

  createAppointment(payload: AppointmentWriteDto): Observable<AppointmentDto> {
    try {
      const created = this.writeAppointment(null, payload);
      this.applySessionDelta({ ...created, status: 'pending' }, created);
      this.store.appointments.push(created);
      return of(structuredClone(created));
    } catch (error) {
      return throwError(() => error);
    }
  }

  updateAppointment(
    id: string,
    payload: AppointmentWriteDto,
  ): Observable<AppointmentDto> {
    const index = this.store.appointments.findIndex((row) => row.id === id);
    if (index < 0) {
      return throwError(() => new ApiNotFoundError('appointment', id));
    }
    try {
      const previous = this.store.appointments[index];
      const updated = this.writeAppointment(previous, payload);
      this.applySessionDelta(previous, updated);
      this.store.appointments[index] = updated;
      return of(structuredClone(updated));
    } catch (error) {
      return throwError(() => error);
    }
  }

  deleteAppointment(id: string): Observable<void> {
    const index = this.store.appointments.findIndex((row) => row.id === id);
    if (index < 0) {
      return throwError(() => new ApiNotFoundError('appointment', id));
    }
    const previous = this.store.appointments[index];
    this.applySessionDelta(previous, { ...previous, status: 'cancelled' });
    this.store.appointments.splice(index, 1);
    return of(undefined);
  }

  getAvailability(query: AvailabilityQuery): Observable<AvailabilitySlotDto[]> {
    const service = this.store.services.find((row) => row.id === query.serviceId);
    if (!service) {
      return throwError(() => new ApiNotFoundError('service', query.serviceId));
    }
    const actor = this.actor();
    return of(
      listAvailabilitySlots({
        service,
        schedules: this.store.trainerSchedules,
        appointments: this.store.appointments,
        settings: this.store.bookingSettings,
        now: new Date(),
        from: new Date(query.from),
        to: new Date(query.to),
        actor,
        trainerId: query.trainerId,
        ignoreAppointmentId: query.ignoreAppointmentId,
      }),
    );
  }

  getBookingSettings(): Observable<BookingSettingsDto> {
    return of(structuredClone(this.store.bookingSettings));
  }

  updateBookingSettings(payload: BookingSettingsWriteDto): Observable<BookingSettingsDto> {
    const updated: BookingSettingsDto = {
      ...this.store.bookingSettings,
      ...payload,
    };
    this.store.bookingSettings = updated;
    return of(structuredClone(updated));
  }

  getTrainerSchedules(trainerId?: string): Observable<TrainerScheduleDto[]> {
    const rows = trainerId
      ? this.store.trainerSchedules.filter((row) => row.trainerId === trainerId)
      : this.store.trainerSchedules;
    return of(structuredClone(rows));
  }

  createTrainerSchedule(payload: TrainerScheduleWriteDto): Observable<TrainerScheduleDto> {
    const created: TrainerScheduleDto = { ...payload, id: crypto.randomUUID() };
    this.store.trainerSchedules.push(created);
    return of(structuredClone(created));
  }

  updateTrainerSchedule(
    id: string,
    payload: TrainerScheduleWriteDto,
  ): Observable<TrainerScheduleDto> {
    const index = this.store.trainerSchedules.findIndex((row) => row.id === id);
    if (index < 0) {
      return throwError(() => new ApiNotFoundError('trainer-schedule', id));
    }
    const updated: TrainerScheduleDto = { ...payload, id };
    this.store.trainerSchedules[index] = updated;
    return of(structuredClone(updated));
  }

  deleteTrainerSchedule(id: string): Observable<void> {
    const index = this.store.trainerSchedules.findIndex((row) => row.id === id);
    if (index < 0) {
      return throwError(() => new ApiNotFoundError('trainer-schedule', id));
    }
    this.store.trainerSchedules.splice(index, 1);
    return of(undefined);
  }

  private writeAppointment(
    previous: AppointmentDto | null,
    payload: AppointmentWriteDto,
  ): AppointmentDto {
    const actor = this.actor();
    const now = new Date();
    const service = this.store.services.find((row) => row.id === payload.serviceId);
    if (!service) {
      throw new ApiNotFoundError('service', payload.serviceId);
    }
    const client = this.store.clients.find((row) => row.id === payload.clientId);
    if (!client) {
      throw new ApiNotFoundError('client', payload.clientId);
    }
    const trainer = this.store.trainers.find((row) => row.id === payload.trainerId);
    if (!trainer) {
      throw new ApiNotFoundError('trainer', payload.trainerId);
    }

    const startsAt = payload.startsAt;
    const endsAt =
      payload.endsAt || addMinutes(new Date(startsAt), service.durationMinutes).toISOString();
    const location = payload.location || this.store.bookingSettings.defaultLocation;
    const ignoreId = previous?.id;

    if (actor === 'client') {
      this.assertClientWrite(previous, payload, service, now, startsAt, endsAt);
    }

    const clientBono = this.resolveBono(
      actor,
      payload.clientId,
      service,
      payload.clientBonoId,
      now,
    );
    const status = this.resolveStatus(actor, previous, payload, client.instantConfirm);
    const created: AppointmentDto = {
      id: previous?.id ?? crypto.randomUUID(),
      trainerId: payload.trainerId,
      clientId: payload.clientId,
      serviceId: payload.serviceId,
      startsAt,
      endsAt,
      location,
      status,
    };
    if (clientBono) {
      created.clientBonoId = clientBono.id;
    }
    this.assertSlotFree(created, ignoreId);
    return created;
  }

  private assertClientWrite(
    previous: AppointmentDto | null,
    payload: AppointmentWriteDto,
    service: { bookableByClient: boolean; id: string; durationMinutes: number },
    now: Date,
    startsAt: string,
    endsAt: string,
  ): void {
    const session = this.store.session;
    const clientId = session?.user.clientId ?? payload.clientId;
    if (payload.clientId !== clientId || (previous && previous.clientId !== clientId)) {
      throw new ApiBusinessError(BOOKING_ERROR_CODES.invalidStatus);
    }
    if (payload.status === 'cancelled') {
      return;
    }
    if (!service.bookableByClient) {
      throw new ApiBusinessError(BOOKING_ERROR_CODES.serviceNotBookable);
    }
    if (
      previous &&
      (previous.status === 'completed' || previous.status === 'cancelled')
    ) {
      throw new ApiBusinessError(BOOKING_ERROR_CODES.invalidStatus);
    }
    const slots = listAvailabilitySlots({
      service: this.store.services.find((row) => row.id === service.id)!,
      schedules: this.store.trainerSchedules,
      appointments: this.store.appointments,
      settings: this.store.bookingSettings,
      now,
      from: new Date(startsAt),
      to: new Date(startsAt),
      actor: 'client',
      trainerId: payload.trainerId,
      ignoreAppointmentId: previous?.id,
    });
    if (!slotMatches(slots, payload.trainerId, startsAt, endsAt)) {
      throw new ApiBusinessError(BOOKING_ERROR_CODES.cutoff);
    }
    const hasOtherActive = this.store.appointments.some(
      (row) =>
        row.clientId === payload.clientId &&
        row.id !== previous?.id &&
        isActiveClientAppointment(row.status),
    );
    if (hasOtherActive) {
      throw new ApiBusinessError(BOOKING_ERROR_CODES.oneAppointment);
    }
  }

  private resolveBono(
    actor: BookingActor,
    clientId: string,
    service: { id: string; allowsSingleSession: boolean },
    requestedId: string | undefined,
    now: Date,
  ): ClientBonoDto | undefined {
    const contracted = this.store.clientBonos.filter((row) => row.clientId === clientId);
    const matching = contracted.filter((row) => {
      const bono = this.store.bonos.find((item) => item.id === row.bonoId);
      return bono?.serviceId === service.id;
    });
    if (actor === 'client') {
      const picked = pickPreferredBono(matching, now);
      if (!picked) {
        throw new ApiBusinessError(BOOKING_ERROR_CODES.bonoRequired);
      }
      return picked;
    }
    if (requestedId) {
      const row = matching.find((item) => item.id === requestedId);
      if (!row) {
        throw new ApiNotFoundError('client-bono', requestedId);
      }
      if (row.remainingSessions <= 0) {
        throw new ApiBusinessError(BOOKING_ERROR_CODES.noSessions);
      }
      if (!isBonoUsable(row, now)) {
        throw new ApiBusinessError(BOOKING_ERROR_CODES.expiredBono);
      }
      return row;
    }
    if (!service.allowsSingleSession) {
      const picked = pickPreferredBono(matching, now);
      if (!picked) {
        throw new ApiBusinessError(BOOKING_ERROR_CODES.bonoRequired);
      }
      return picked;
    }
    return undefined;
  }

  private resolveStatus(
    actor: BookingActor,
    previous: AppointmentDto | null,
    payload: AppointmentWriteDto,
    instantConfirm: boolean,
  ) {
    if (actor === 'client') {
      if (payload.status === 'cancelled') {
        return 'cancelled' as const;
      }
      if (previous && (payload.startsAt !== previous.startsAt || payload.trainerId !== previous.trainerId)) {
        return statusOnClientReschedule(instantConfirm);
      }
      return previous?.status === 'confirmed' && instantConfirm
        ? 'confirmed'
        : statusOnCreate(actor, instantConfirm);
    }
    if (payload.status) {
      return payload.status;
    }
    return previous?.status ?? statusOnCreate(actor, instantConfirm);
  }

  private assertSlotFree(appointment: AppointmentDto, ignoreId?: string): void {
    if (!occupiesTrainerSlot(appointment.status)) {
      return;
    }
    const start = new Date(appointment.startsAt);
    const end = new Date(appointment.endsAt);
    const taken = this.store.appointments.some((row) => {
      if (row.id === ignoreId || !occupiesTrainerSlot(row.status) || row.trainerId !== appointment.trainerId) {
        return false;
      }
      return start < new Date(row.endsAt) && end > new Date(row.startsAt);
    });
    if (taken) {
      throw new ApiBusinessError(BOOKING_ERROR_CODES.slotTaken);
    }
  }

  private applySessionDelta(previous: AppointmentDto, next: AppointmentDto): void {
    const bonoId = next.clientBonoId ?? previous.clientBonoId;
    if (!bonoId) {
      return;
    }
    const delta = remainingSessionsDelta(previous.status, next.status);
    if (delta === 0) {
      return;
    }
    const bono = this.store.clientBonos.find((row) => row.id === bonoId);
    if (!bono) {
      return;
    }
    bono.remainingSessions = Math.max(0, bono.remainingSessions + delta);
  }

  private actor(): BookingActor {
    return this.store.session?.user.role === 'client' ? 'client' : 'trainer';
  }
}

export function filterAppointments(
  appointments: AppointmentDto[],
  query?: AppointmentQuery,
): AppointmentDto[] {
  if (!query) {
    return appointments;
  }
  return appointments.filter((row) => {
    if (query.trainerId && row.trainerId !== query.trainerId) {
      return false;
    }
    if (query.clientId && row.clientId !== query.clientId) {
      return false;
    }
    if (query.from && row.startsAt < query.from) {
      return false;
    }
    if (query.to && row.startsAt > query.to) {
      return false;
    }
    return true;
  });
}
