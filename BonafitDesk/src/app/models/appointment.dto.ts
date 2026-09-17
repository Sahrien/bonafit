export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface AppointmentDto {
  id: string;
  trainerId: string;
  clientId: string;
  serviceId: string;
  clientBonoId?: string | null;
  isGift?: boolean;
  startsAt: string;
  endsAt: string;
  location: string;
  status: AppointmentStatus;
  notes?: string;
}

export type AppointmentWriteDto = Omit<
  AppointmentDto,
  'id' | 'status' | 'location' | 'endsAt' | 'clientBonoId' | 'isGift' | 'notes'
> & {
  status?: AppointmentStatus;
  location?: string;
  endsAt?: string;
  clientBonoId?: string | null;
  notes?: string;
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
