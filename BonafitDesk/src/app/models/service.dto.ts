export type LocaleText = {
  es?: string;
  en?: string;
};

export type CatalogI18n = Record<string, LocaleText>;
export type SaleKind = 'none' | 'percent' | 'amount';

export function catalogText(
  i18n: CatalogI18n | undefined,
  key: string,
  lang: 'es' | 'en',
  fallback = '',
): string {
  return i18n?.[key]?.[lang] ?? fallback;
}

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
  saleKind?: SaleKind;
  saleValue?: number;
  i18n?: CatalogI18n;
}

export type ServiceWriteDto = Omit<ServiceDto, 'id'>;
