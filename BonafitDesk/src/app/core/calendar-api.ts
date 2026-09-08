import { Observable } from 'rxjs';
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
  getAvailability(query: AvailabilityQuery): Observable<AvailabilitySlotDto[]>;
  getBookingSettings(): Observable<BookingSettingsDto>;
  updateBookingSettings(payload: BookingSettingsWriteDto): Observable<BookingSettingsDto>;
  getTrainerSchedules(trainerId?: string): Observable<TrainerScheduleDto[]>;
  createTrainerSchedule(payload: TrainerScheduleWriteDto): Observable<TrainerScheduleDto>;
  updateTrainerSchedule(
    id: string,
    payload: TrainerScheduleWriteDto,
  ): Observable<TrainerScheduleDto>;
  deleteTrainerSchedule(id: string): Observable<void>;
}
