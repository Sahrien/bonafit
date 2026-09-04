import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { ApiNotFoundError } from '../core/api-not-found.error';
import { CalendarApi } from '../core/calendar-api';
import { MockStore } from '../core/mock-store.service';
import {
  AppointmentDto,
  AppointmentQuery,
  AppointmentWriteDto,
} from '../models/appointment.dto';
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
    const created: AppointmentDto = { ...payload, id: crypto.randomUUID() };
    this.store.appointments.push(created);
    return of(structuredClone(created));
  }

  updateAppointment(
    id: string,
    payload: AppointmentWriteDto,
  ): Observable<AppointmentDto> {
    const index = this.store.appointments.findIndex((row) => row.id === id);
    if (index < 0) {
      return throwError(() => new ApiNotFoundError('appointment', id));
    }
    const updated: AppointmentDto = { ...payload, id };
    this.store.appointments[index] = updated;
    return of(structuredClone(updated));
  }

  deleteAppointment(id: string): Observable<void> {
    const index = this.store.appointments.findIndex((row) => row.id === id);
    if (index < 0) {
      return throwError(() => new ApiNotFoundError('appointment', id));
    }
    this.store.appointments.splice(index, 1);
    return of(undefined);
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
