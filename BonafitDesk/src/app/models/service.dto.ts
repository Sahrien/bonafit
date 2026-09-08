export type ServiceCategory =
  | 'entrenamiento-personal'
  | 'hipopresivos'
  | 'masaje';

export interface ServiceDto {
  id: string;
  category: ServiceCategory;
  name: string;
  allowsSingleSession: boolean;
  singleSessionPrice?: number;
  durationMinutes: number;
  bookableByClient: boolean;
}

export type ServiceWriteDto = Omit<ServiceDto, 'id'>;
