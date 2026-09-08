import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_PATHS, apiUrl } from '../core/api-url';
import { CalendarApi } from '../core/calendar-api';
import { toHttpParams } from '../core/http-params';
import {
  AppointmentDto,
  AppointmentQuery,
  AppointmentWriteDto,
  AvailabilityQuery,
  AvailabilitySlotDto,
} from '../models/appointment.dto';
import { BookingSettingsDto, BookingSettingsWriteDto } from '../models/booking-settings.dto';
import { TrainerScheduleDto, TrainerScheduleWriteDto } from '../models/trainer-schedule.dto';
import { TrainerDto } from '../models/trainer.dto';

@Injectable({ providedIn: 'root' })
export class CalendarHttpApi implements CalendarApi {
  private readonly http = inject(HttpClient);

  getTrainers(): Observable<TrainerDto[]> {
    return this.http.get<TrainerDto[]>(apiUrl(API_PATHS.trainers));
  }

  getTrainer(id: string): Observable<TrainerDto> {
    return this.http.get<TrainerDto>(apiUrl(API_PATHS.trainers, id));
  }

  getAppointments(query?: AppointmentQuery): Observable<AppointmentDto[]> {
    return this.http.get<AppointmentDto[]>(apiUrl(API_PATHS.appointments), {
      params: toHttpParams({
        trainerId: query?.trainerId,
        clientId: query?.clientId,
        from: query?.from,
        to: query?.to,
      }),
    });
  }

  getAppointment(id: string): Observable<AppointmentDto> {
    return this.http.get<AppointmentDto>(apiUrl(API_PATHS.appointments, id));
  }

  createAppointment(payload: AppointmentWriteDto): Observable<AppointmentDto> {
    return this.http.post<AppointmentDto>(apiUrl(API_PATHS.appointments), payload);
  }

  updateAppointment(
    id: string,
    payload: AppointmentWriteDto,
  ): Observable<AppointmentDto> {
    return this.http.put<AppointmentDto>(apiUrl(API_PATHS.appointments, id), payload);
  }

  deleteAppointment(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(API_PATHS.appointments, id));
  }

  getAvailability(query: AvailabilityQuery): Observable<AvailabilitySlotDto[]> {
    return this.http.get<AvailabilitySlotDto[]>(apiUrl(API_PATHS.availability), {
      params: toHttpParams({
        serviceId: query.serviceId,
        clientId: query.clientId,
        trainerId: query.trainerId,
        from: query.from,
        to: query.to,
        ignoreAppointmentId: query.ignoreAppointmentId,
      }),
    });
  }

  getBookingSettings(): Observable<BookingSettingsDto> {
    return this.http.get<BookingSettingsDto>(apiUrl(API_PATHS.bookingSettings));
  }

  updateBookingSettings(payload: BookingSettingsWriteDto): Observable<BookingSettingsDto> {
    return this.http.put<BookingSettingsDto>(apiUrl(API_PATHS.bookingSettings), payload);
  }

  getTrainerSchedules(trainerId?: string): Observable<TrainerScheduleDto[]> {
    return this.http.get<TrainerScheduleDto[]>(apiUrl(API_PATHS.trainerSchedules), {
      params: toHttpParams({ trainerId }),
    });
  }

  createTrainerSchedule(payload: TrainerScheduleWriteDto): Observable<TrainerScheduleDto> {
    return this.http.post<TrainerScheduleDto>(apiUrl(API_PATHS.trainerSchedules), payload);
  }

  updateTrainerSchedule(
    id: string,
    payload: TrainerScheduleWriteDto,
  ): Observable<TrainerScheduleDto> {
    return this.http.put<TrainerScheduleDto>(
      apiUrl(API_PATHS.trainerSchedules, id),
      payload,
    );
  }

  deleteTrainerSchedule(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(API_PATHS.trainerSchedules, id));
  }
}
