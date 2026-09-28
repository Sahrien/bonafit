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
import {
  PublicHolidayDto,
  PublicHolidayWriteDto,
  ResolvedDayDto,
  ScheduleAbsenceDto,
  ScheduleAbsenceWriteDto,
  ScheduleDateWindowDto,
  ScheduleDateWindowWriteDto,
  ScheduleHoursDto,
  ScheduleRangeQuery,
  ScheduleResolvedQuery,
} from '../models/schedule.dto';
import { TrainerScheduleDto, TrainerScheduleWriteDto } from '../models/trainer-schedule.dto';
import { TrainerDto, TrainerWriteDto } from '../models/trainer.dto';

@Injectable({ providedIn: 'root' })
export class CalendarApiService implements CalendarApi {
  private readonly http = inject(HttpClient);

  getTrainers(): Observable<TrainerDto[]> {
    return this.http.get<TrainerDto[]>(apiUrl(API_PATHS.trainers));
  }

  getTrainer(id: string): Observable<TrainerDto> {
    return this.http.get<TrainerDto>(apiUrl(API_PATHS.trainers, id));
  }

  updateTrainer(id: string, payload: TrainerWriteDto): Observable<TrainerDto> {
    return this.http.put<TrainerDto>(apiUrl(API_PATHS.trainers, id), payload);
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

  getScheduleDateWindows(query?: ScheduleRangeQuery): Observable<ScheduleDateWindowDto[]> {
    return this.http.get<ScheduleDateWindowDto[]>(apiUrl(API_PATHS.scheduleDateWindows), {
      params: toHttpParams({
        trainerId: query?.trainerId,
        from: query?.from,
        to: query?.to,
      }),
    });
  }

  createScheduleDateWindow(payload: ScheduleDateWindowWriteDto): Observable<ScheduleDateWindowDto> {
    return this.http.post<ScheduleDateWindowDto>(apiUrl(API_PATHS.scheduleDateWindows), payload);
  }

  updateScheduleDateWindow(
    id: string,
    payload: ScheduleDateWindowWriteDto,
  ): Observable<ScheduleDateWindowDto> {
    return this.http.put<ScheduleDateWindowDto>(apiUrl(API_PATHS.scheduleDateWindows, id), payload);
  }

  deleteScheduleDateWindow(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(API_PATHS.scheduleDateWindows, id));
  }

  getScheduleAbsences(query?: ScheduleRangeQuery): Observable<ScheduleAbsenceDto[]> {
    return this.http.get<ScheduleAbsenceDto[]>(apiUrl(API_PATHS.scheduleAbsences), {
      params: toHttpParams({
        trainerId: query?.trainerId,
        from: query?.from,
        to: query?.to,
      }),
    });
  }

  createScheduleAbsence(payload: ScheduleAbsenceWriteDto): Observable<ScheduleAbsenceDto> {
    return this.http.post<ScheduleAbsenceDto>(apiUrl(API_PATHS.scheduleAbsences), payload);
  }

  updateScheduleAbsence(
    id: string,
    payload: ScheduleAbsenceWriteDto,
  ): Observable<ScheduleAbsenceDto> {
    return this.http.put<ScheduleAbsenceDto>(apiUrl(API_PATHS.scheduleAbsences, id), payload);
  }

  deleteScheduleAbsence(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(API_PATHS.scheduleAbsences, id));
  }

  getPublicHolidays(query?: ScheduleRangeQuery): Observable<PublicHolidayDto[]> {
    return this.http.get<PublicHolidayDto[]>(apiUrl(API_PATHS.publicHolidays), {
      params: toHttpParams({
        from: query?.from,
        to: query?.to,
      }),
    });
  }

  createPublicHoliday(payload: PublicHolidayWriteDto): Observable<PublicHolidayDto> {
    return this.http.post<PublicHolidayDto>(apiUrl(API_PATHS.publicHolidays), payload);
  }

  updatePublicHoliday(id: string, payload: PublicHolidayWriteDto): Observable<PublicHolidayDto> {
    return this.http.put<PublicHolidayDto>(apiUrl(API_PATHS.publicHolidays, id), payload);
  }

  deletePublicHoliday(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(API_PATHS.publicHolidays, id));
  }

  getResolvedSchedules(query: ScheduleResolvedQuery): Observable<ResolvedDayDto[]> {
    return this.http.get<ResolvedDayDto[]>(apiUrl(API_PATHS.schedulesResolved), {
      params: toHttpParams({
        from: query.from,
        to: query.to,
        trainerId: query.trainerId,
      }),
    });
  }

  getScheduleHours(query: ScheduleResolvedQuery): Observable<ScheduleHoursDto> {
    return this.http.get<ScheduleHoursDto>(apiUrl(API_PATHS.schedulesHours), {
      params: toHttpParams({
        from: query.from,
        to: query.to,
        trainerId: query.trainerId,
      }),
    });
  }
}
