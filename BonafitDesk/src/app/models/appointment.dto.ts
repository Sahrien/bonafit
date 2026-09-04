export interface AppointmentDto {
  id: string;
  trainerId: string;
  clientId: string;
  serviceId: string;
  clientBonoId?: string;
  startsAt: string;
  endsAt: string;
  location: string;
}

export type AppointmentWriteDto = Omit<AppointmentDto, 'id'>;

export interface AppointmentQuery {
  trainerId?: string;
  clientId?: string;
  from?: string;
  to?: string;
}
