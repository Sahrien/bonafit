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
  studioName: 'BonaFIT',
  slogan: 'Wellness & Longevity',
  primaryHex: '#264233',
  accentHex: '#426456',
  surfaceHex: '#F3F0EB',
  colorScheme: 'light',
  logoUrl: null,
  faviconUrl: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
};
