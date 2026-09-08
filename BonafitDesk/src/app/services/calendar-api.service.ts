import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CalendarApi } from '../core/calendar-api';
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
import { CalendarHttpApi } from './calendar-http.service';
import { CalendarMockApi } from './calendar-mock.service';

@Injectable({ providedIn: 'root' })
export class CalendarApiService implements CalendarApi {
  private readonly impl: CalendarApi = environment.useMockApi
    ? inject(CalendarMockApi)
    : inject(CalendarHttpApi);

  getTrainers(): Observable<TrainerDto[]> {
    return this.impl.getTrainers();
  }

  getTrainer(id: string): Observable<TrainerDto> {
    return this.impl.getTrainer(id);
  }

  getAppointments(query?: AppointmentQuery): Observable<AppointmentDto[]> {
    return this.impl.getAppointments(query);
  }

  getAppointment(id: string): Observable<AppointmentDto> {
    return this.impl.getAppointment(id);
  }

  createAppointment(payload: AppointmentWriteDto): Observable<AppointmentDto> {
    return this.impl.createAppointment(payload);
  }

  updateAppointment(
    id: string,
    payload: AppointmentWriteDto,
  ): Observable<AppointmentDto> {
    return this.impl.updateAppointment(id, payload);
  }

  deleteAppointment(id: string): Observable<void> {
    return this.impl.deleteAppointment(id);
  }

  getAvailability(query: AvailabilityQuery): Observable<AvailabilitySlotDto[]> {
    return this.impl.getAvailability(query);
  }

  getBookingSettings(): Observable<BookingSettingsDto> {
    return this.impl.getBookingSettings();
  }

  updateBookingSettings(payload: BookingSettingsWriteDto): Observable<BookingSettingsDto> {
    return this.impl.updateBookingSettings(payload);
  }

  getTrainerSchedules(trainerId?: string): Observable<TrainerScheduleDto[]> {
    return this.impl.getTrainerSchedules(trainerId);
  }

  createTrainerSchedule(payload: TrainerScheduleWriteDto): Observable<TrainerScheduleDto> {
    return this.impl.createTrainerSchedule(payload);
  }

  updateTrainerSchedule(
    id: string,
    payload: TrainerScheduleWriteDto,
  ): Observable<TrainerScheduleDto> {
    return this.impl.updateTrainerSchedule(id, payload);
  }

  deleteTrainerSchedule(id: string): Observable<void> {
    return this.impl.deleteTrainerSchedule(id);
  }
}
