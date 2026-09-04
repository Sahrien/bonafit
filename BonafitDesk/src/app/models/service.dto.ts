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
}

export type ServiceWriteDto = Omit<ServiceDto, 'id'>;
