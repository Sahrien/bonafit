export type ColorScheme = 'light' | 'dark' | 'system';

export interface BrandingDto {
  id: string;
  studioName: string;
  slogan: string;
  primaryHex: string;
  accentHex: string;
  surfaceHex: string;
  colorScheme: ColorScheme;
  logoUrl: string | null;
  faviconUrl: string | null;
  updatedAt: string;
}

export type BrandingWriteDto = Pick<
  BrandingDto,
  'studioName' | 'slogan' | 'primaryHex' | 'accentHex' | 'surfaceHex' | 'colorScheme'
>;

export const DEFAULT_BRANDING: BrandingDto = {
  id: 'branding',
  studioName: 'Bonafit',
  slogan: 'Wellness & Longevity',
  primaryHex: '#0f766e',
  accentHex: '#c2410c',
  surfaceHex: '#f5f3f0',
  colorScheme: 'light',
  logoUrl: null,
  faviconUrl: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
};
