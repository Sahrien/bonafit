import { BrandFontId } from '../core/font-catalog';

export type ColorScheme = 'light' | 'dark' | 'system';

export interface BrandingDto {
  id: string;
  studioName: string;
  slogan: string;
  primaryHex: string;
  accentHex: string;
  surfaceHex: string;
  colorScheme: ColorScheme;
  headingFont: BrandFontId;
  bodyFont: BrandFontId;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  updatedAt: string;
}

export type BrandingWriteDto = Pick<
  BrandingDto,
  | 'studioName'
  | 'slogan'
  | 'primaryHex'
  | 'accentHex'
  | 'surfaceHex'
  | 'colorScheme'
  | 'headingFont'
  | 'bodyFont'
>;

export type BrandingTypographyDto = Pick<BrandingDto, 'headingFont' | 'bodyFont'>;

export const DEFAULT_BRANDING: BrandingDto = {
  id: 'branding',
  studioName: 'Bonafit',
  slogan: 'Wellness & Longevity',
  primaryHex: '#0f766e',
  accentHex: '#c2410c',
  surfaceHex: '#f5f3f0',
  colorScheme: 'light',
  headingFont: 'inter',
  bodyFont: 'inter',
  logoUrl: null,
  logoDarkUrl: null,
  faviconUrl: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
};
