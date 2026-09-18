import { CatalogI18n } from './service.dto';

export interface BonoDto {
  id: string;
  serviceId: string;
  name: string;
  description: string;
  sessionCount: number;
  price: number;
  i18n?: CatalogI18n;
}

export type BonoWriteDto = Omit<BonoDto, 'id'>;
