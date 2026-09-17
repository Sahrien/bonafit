export interface ServiceDto {
  id: string;
  name: string;
  sharesSessionPool: boolean;
  forcesSingleSession: boolean;
  allowsSingleSession: boolean;
  singleSessionPrice?: number;
  durationMinutes: number;
  bookableByClient: boolean;
  active: boolean;
}

export type ServiceWriteDto = Omit<ServiceDto, 'id'>;
