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
} from '../models/appointment.dto';
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
    return this.http.post<AppointmentDto>(
      apiUrl(API_PATHS.appointments),
      payload,
    );
  }

  updateAppointment(
    id: string,
    payload: AppointmentWriteDto,
  ): Observable<AppointmentDto> {
    return this.http.put<AppointmentDto>(
      apiUrl(API_PATHS.appointments, id),
      payload,
    );
  }

  deleteAppointment(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(API_PATHS.appointments, id));
  }
}
