import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CalendarApi } from '../core/calendar-api';
import {
  AppointmentDto,
  AppointmentQuery,
  AppointmentWriteDto,
} from '../models/appointment.dto';
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
}

