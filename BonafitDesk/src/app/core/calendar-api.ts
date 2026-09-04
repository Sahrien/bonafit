import { Observable } from 'rxjs';
import {
  AppointmentDto,
  AppointmentQuery,
  AppointmentWriteDto,
} from '../models/appointment.dto';
import { TrainerDto } from '../models/trainer.dto';

export interface CalendarApi {
  getTrainers(): Observable<TrainerDto[]>;
  getTrainer(id: string): Observable<TrainerDto>;
  getAppointments(query?: AppointmentQuery): Observable<AppointmentDto[]>;
  getAppointment(id: string): Observable<AppointmentDto>;
  createAppointment(payload: AppointmentWriteDto): Observable<AppointmentDto>;
  updateAppointment(
    id: string,
    payload: AppointmentWriteDto,
  ): Observable<AppointmentDto>;
  deleteAppointment(id: string): Observable<void>;
}
