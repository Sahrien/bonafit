import { Injectable } from '@angular/core';
import { AppointmentDto } from '../models/appointment.dto';
import { AuthSessionDto, AuthUserDto } from '../models/auth-session.dto';
import { BonoDto } from '../models/bono.dto';
import { BookingSettingsDto } from '../models/booking-settings.dto';
import { ClientBonoDto } from '../models/client-bono.dto';
import { ClientDto } from '../models/client.dto';
import { FormAssignmentDto, FormDto } from '../models/form.dto';
import { ServiceDto } from '../models/service.dto';
import { TrainerScheduleDto } from '../models/trainer-schedule.dto';
import { TrainerDto } from '../models/trainer.dto';
import { createMockDatabase, MockDatabase } from './mock-data';

@Injectable({ providedIn: 'root' })
export class MockStore {
  private db: MockDatabase = createMockDatabase();
  session: AuthSessionDto | null = null;

  reset(): void {
    this.db = createMockDatabase();
    this.session = null;
  }

  get trainers(): TrainerDto[] {
    return this.db.trainers;
  }

  get clients(): ClientDto[] {
    return this.db.clients;
  }

  get services(): ServiceDto[] {
    return this.db.services;
  }

  get bonos(): BonoDto[] {
    return this.db.bonos;
  }

  get clientBonos(): ClientBonoDto[] {
    return this.db.clientBonos;
  }

  get appointments(): AppointmentDto[] {
    return this.db.appointments;
  }

  get trainerSchedules(): TrainerScheduleDto[] {
    return this.db.trainerSchedules;
  }

  get bookingSettings(): BookingSettingsDto {
    return this.db.bookingSettings;
  }

  set bookingSettings(value: BookingSettingsDto) {
    this.db.bookingSettings = value;
  }

  get forms(): FormDto[] {
    return this.db.forms;
  }

  get formAssignments(): FormAssignmentDto[] {
    return this.db.formAssignments;
  }

  get accounts(): AuthUserDto[] {
    return this.db.accounts;
  }
}
