export type LocaleText = {
  es?: string;
  en?: string;
};

export type CatalogI18n = Record<string, LocaleText>;

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
  i18n?: CatalogI18n;
}

export type ServiceWriteDto = Omit<ServiceDto, 'id'>;
