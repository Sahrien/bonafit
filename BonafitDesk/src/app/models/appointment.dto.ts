export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface AppointmentDto {
  id: string;
  trainerId: string;
  clientId: string;
  serviceId: string;
  clientBonoId?: string;
  startsAt: string;
  endsAt: string;
  location: string;
  status: AppointmentStatus;
}

export type AppointmentWriteDto = Omit<AppointmentDto, 'id' | 'status' | 'location' | 'endsAt'> & {
  status?: AppointmentStatus;
  location?: string;
  endsAt?: string;
};

export interface AppointmentQuery {
  trainerId?: string;
  clientId?: string;
  from?: string;
  to?: string;
}

export interface AvailabilityQuery {
  serviceId: string;
  clientId?: string;
  trainerId?: string;
  from: string;
  to: string;
  ignoreAppointmentId?: string;
}

export interface AvailabilitySlotDto {
  trainerId: string;
  startsAt: string;
  endsAt: string;
}
