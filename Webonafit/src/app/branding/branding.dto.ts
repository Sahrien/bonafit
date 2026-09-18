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

export const DEFAULT_BRANDING: BrandingDto = {
  id: 'branding',
  studioName: 'Bonafit',
  slogan: 'Wellness & Longevity',
  primaryHex: '#1b3528',
  accentHex: '#3e5f52',
  surfaceHex: '#f5f3f0',
  colorScheme: 'light',
  logoUrl: null,
  faviconUrl: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
};
